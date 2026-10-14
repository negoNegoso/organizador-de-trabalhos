import type { SupabaseClient } from '@supabase/supabase-js';
import { beforeAll, beforeEach, expect, it } from 'vitest';
import { listarArquivosDoAluno } from '@/lib/dados/arquivos';
import { BUCKET } from '@/lib/dados/storage';
import { criarEnviar } from '@/lib/fila/enviar';
import { novoItem } from '@/lib/fila/fila';
import { clienteLogado, limparTudo, pdfDeTeste, semear } from '../compartilhado/supabase';

let sb: SupabaseClient;
beforeAll(async () => {
  sb = await clienteLogado();
});
beforeEach(async () => {
  await limparTudo();
});

it('envia PDF e miniatura e grava a linha', async () => {
  const s = await semear(sb);
  const pdf = await pdfDeTeste(2);
  const item = novoItem({ alunoId: s.alunos.maria, atividadeId: s.atividadeId, titulo: 'Prova 1' }, pdf, new Uint8Array([0xff, 0xd8, 0xff]), 2);
  await criarEnviar(sb)(item);
  const [arq] = await listarArquivosDoAluno(sb, s.alunos.maria);
  expect(arq).toMatchObject({
    id: item.id,
    titulo: 'Prova 1',
    atividade_id: s.atividadeId,
    paginas: 2,
    tem_miniatura: true,
    tamanho_bytes: pdf.byteLength + 3,
    storage_path: `${s.alunos.maria}/${item.id}.pdf`,
  });
  const baixado = await sb.storage.from(BUCKET).download(arq.storage_path);
  expect(baixado.error).toBeNull();
});

it('reenviar o mesmo item não duplica nem falha', async () => {
  const s = await semear(sb);
  const item = novoItem({ alunoId: s.alunos.maria, atividadeId: null, titulo: 'X' }, await pdfDeTeste(), null, 1);
  const enviar = criarEnviar(sb);
  await enviar(item);
  await enviar(item);
  expect(await listarArquivosDoAluno(sb, s.alunos.maria)).toHaveLength(1);
});

it('se o banco recusa, apaga o objeto enviado e lança erro', async () => {
  const fantasma = crypto.randomUUID();
  const item = novoItem({ alunoId: fantasma, atividadeId: null, titulo: 'X' }, await pdfDeTeste(), null, 1);
  await expect(criarEnviar(sb)(item)).rejects.toThrow();
  const baixado = await sb.storage.from(BUCKET).download(`${fantasma}/${item.id}.pdf`);
  expect(baixado.error).not.toBeNull();
});

it('atividade apagada antes do envio: o trabalho vai para "Outros" (atividade_id null)', async () => {
  const s = await semear(sb);
  const item = novoItem({ alunoId: s.alunos.maria, atividadeId: s.atividadeId, titulo: 'Tarde' }, await pdfDeTeste(), null, 1);
  const { error } = await sb.from('atividades').delete().eq('id', s.atividadeId);
  expect(error).toBeNull();
  await criarEnviar(sb)(item);
  const [arq] = await listarArquivosDoAluno(sb, s.alunos.maria);
  expect(arq).toMatchObject({ id: item.id, atividade_id: null });
});

it('aluno apagado: limpa os objetos e lança "O aluno foi apagado."', async () => {
  const s = await semear(sb);
  const item = novoItem({ alunoId: s.alunos.maria, atividadeId: s.atividadeId, titulo: 'X' }, await pdfDeTeste(), null, 1);
  await sb.from('alunos').delete().eq('id', s.alunos.maria);
  await expect(criarEnviar(sb)(item)).rejects.toThrow('O aluno foi apagado.');
  const baixado = await sb.storage.from(BUCKET).download(`${s.alunos.maria}/${item.id}.pdf`);
  expect(baixado.error).not.toBeNull();
});
