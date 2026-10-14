import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { apagar, contarArquivos } from '@/lib/dados/apagar';
import { criarAno, definirArquivado, listarAnos } from '@/lib/dados/anos';
import { buscarAlunos, criarAlunos, listarAlunos, obterAluno } from '@/lib/dados/alunos';
import { alunosComEntrega, entregasDaTurma } from '@/lib/dados/atividades';
import { listarArquivosDoAluno, moverArquivo, usoStorage } from '@/lib/dados/arquivos';
import { BUCKET } from '@/lib/dados/storage';
import { criarTurma, listarTurmas } from '@/lib/dados/turmas';
import { clienteLogado, criarArquivo, limparTudo, semear } from '../compartilhado/supabase';

let sb: SupabaseClient;
beforeAll(async () => {
  sb = await clienteLogado();
});
beforeEach(async () => {
  await limparTudo();
});

const existe = async (caminho: string) => !(await sb.storage.from(BUCKET).download(caminho)).error;

describe('anos', () => {
  it('lista do mais recente para o mais antigo e arquiva', async () => {
    const a25 = await criarAno(sb, 2025);
    await criarAno(sb, 2026);
    await definirArquivado(sb, a25.id, true);
    expect((await listarAnos(sb)).map((a) => [a.ano, a.arquivado])).toEqual([[2026, false], [2025, true]]);
  });

  it('recusa ano repetido com mensagem clara', async () => {
    await criarAno(sb, 2026);
    await expect(criarAno(sb, 2026)).rejects.toThrow('Esse ano já existe.');
  });
});

describe('alunos', () => {
  it('busca ignora acento e maiúscula', async () => {
    const s = await semear(sb);
    expect(await buscarAlunos(sb, 'JOAO')).toEqual([
      { id: s.alunos.joao, nome: 'João Pedro', turma: { id: s.turmaId, nome: '3º A' }, ano: 2026 },
    ]);
  });

  it('busca com % e _ não quebra nem casa tudo', async () => {
    await semear(sb);
    expect(await buscarAlunos(sb, '%_')).toEqual([]);
  });

  it('lista com contagem de arquivos e detalhe com turma e ano', async () => {
    const s = await semear(sb);
    await criarArquivo(sb, s.alunos.maria, null, 'Livre');
    const lista = await listarAlunos(sb, s.turmaId);
    expect(lista.map((a) => [a.nome, a.total_arquivos])).toEqual([['João Pedro', 0], ['Maria Souza', 1]]);
    const det = await obterAluno(sb, s.alunos.maria);
    expect(det.turmas).toMatchObject({ id: s.turmaId, nome: '3º A', anos_letivos: { ano: 2026 } });
  });

  it('cria vários alunos de uma vez', async () => {
    const s = await semear(sb);
    const novos = await criarAlunos(sb, s.turmaId, ['Ana', 'Bia']);
    expect(novos.map((a) => a.nome)).toEqual(['Ana', 'Bia']);
    expect(await criarAlunos(sb, s.turmaId, [])).toEqual([]);
  });
});

describe('entregas', () => {
  it('agrupa por atividade sem repetir aluno', async () => {
    const s = await semear(sb);
    await criarArquivo(sb, s.alunos.maria, s.atividadeId, 'Prova 1');
    await criarArquivo(sb, s.alunos.maria, s.atividadeId, 'Prova 1 (refeita)');
    await criarArquivo(sb, s.alunos.joao, null, 'Livre');
    expect(await entregasDaTurma(sb, s.turmaId)).toEqual({ [s.atividadeId]: [s.alunos.maria] });
    expect(await alunosComEntrega(sb, s.atividadeId)).toEqual([s.alunos.maria]);
  });
});

describe('mover', () => {
  it('para aluno de outra turma: muda caminho e tira a atividade', async () => {
    const s = await semear(sb);
    const turmaB = await criarTurma(sb, s.anoId, '3º B');
    const [ana] = await criarAlunos(sb, turmaB.id, ['Ana']);
    const arq = await criarArquivo(sb, s.alunos.maria, s.atividadeId, 'Prova 1');
    await moverArquivo(sb, arq, ana);
    const [movido] = await listarArquivosDoAluno(sb, ana.id);
    expect(movido).toMatchObject({ id: arq.id, atividade_id: null, titulo: 'Prova 1', storage_path: `${ana.id}/${arq.id}.pdf` });
    expect(await existe(movido.storage_path)).toBe(true);
    expect(await existe(arq.storage_path)).toBe(false);
  });

  it('na mesma turma mantém a atividade', async () => {
    const s = await semear(sb);
    const arq = await criarArquivo(sb, s.alunos.maria, s.atividadeId, 'Prova 1');
    await moverArquivo(sb, arq, { id: s.alunos.joao, turma_id: s.turmaId });
    const [movido] = await listarArquivosDoAluno(sb, s.alunos.joao);
    expect(movido.atividade_id).toBe(s.atividadeId);
  });
});

describe('apagar', () => {
  it('turma: conta, remove do storage e apaga as linhas', async () => {
    const s = await semear(sb);
    const a1 = await criarArquivo(sb, s.alunos.maria, s.atividadeId, 'P1');
    const a2 = await criarArquivo(sb, s.alunos.joao, null, 'Livre');
    expect(await contarArquivos(sb, { tipo: 'turma', id: s.turmaId })).toBe(2);
    await apagar(sb, { tipo: 'turma', id: s.turmaId });
    expect(await listarTurmas(sb, s.anoId)).toEqual([]);
    expect(await existe(a1.storage_path)).toBe(false);
    expect(await existe(a2.storage_path)).toBe(false);
  });

  it('ano inteiro', async () => {
    const s = await semear(sb);
    await criarArquivo(sb, s.alunos.maria, null, 'X');
    expect(await contarArquivos(sb, { tipo: 'ano', id: s.anoId })).toBe(1);
    await apagar(sb, { tipo: 'ano', id: s.anoId });
    expect(await listarAnos(sb)).toEqual([]);
  });

  it('turma sem arquivos', async () => {
    const s = await semear(sb);
    expect(await contarArquivos(sb, { tipo: 'turma', id: s.turmaId })).toBe(0);
    await apagar(sb, { tipo: 'turma', id: s.turmaId });
    expect(await listarTurmas(sb, s.anoId)).toEqual([]);
  });

  it('um arquivo', async () => {
    const s = await semear(sb);
    const a = await criarArquivo(sb, s.alunos.maria, null, 'X');
    await apagar(sb, { tipo: 'arquivo', id: a.id });
    expect(await listarArquivosDoAluno(sb, s.alunos.maria)).toEqual([]);
    expect(await existe(a.storage_path)).toBe(false);
  });
});

describe('uso', () => {
  it('soma o tamanho dos arquivos', async () => {
    const s = await semear(sb);
    const a = await criarArquivo(sb, s.alunos.maria, null, 'X');
    expect(await usoStorage(sb)).toBe(a.tamanho_bytes);
  });
});

describe('cadastro', () => {
  it('recusa cadastro público', async () => {
    const anon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false } },
    );
    const { error } = await anon.auth.signUp({
      email: `${crypto.randomUUID()}@teste.local`,
      password: 'qualquer-123456',
    });
    expect(error).not.toBeNull();
  });
});
