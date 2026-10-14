import type { SupabaseClient } from '@supabase/supabase-js';
import { atividadeAposMover } from '../dominio/mover';
import type { Aluno, Arquivo, Recente } from '../tipos';
import { checar, type Resposta } from './consulta';
import { BUCKET, caminhoMiniatura, caminhoPdf } from './storage';

const CAMPOS = 'id,aluno_id,atividade_id,titulo,storage_path,paginas,tamanho_bytes,tem_miniatura,criado_em';

export async function listarArquivosDoAluno(sb: SupabaseClient, alunoId: string): Promise<Arquivo[]> {
  return checar(
    await sb.from('arquivos').select(CAMPOS).eq('aluno_id', alunoId).order('criado_em', { ascending: false }),
  );
}

export async function listarRecentes(sb: SupabaseClient, limite = 5): Promise<Recente[]> {
  type Linha = {
    id: string;
    titulo: string;
    criado_em: string;
    alunos: { id: string; nome: string; turmas: { nome: string; cor: Recente['turma']['cor'] } };
  };
  const resposta = await sb
    .from('arquivos')
    .select('id,titulo,criado_em,alunos(id,nome,turmas(nome,cor))')
    .order('criado_em', { ascending: false })
    .limit(limite);
  const linhas = checar(resposta as unknown as Resposta<Linha[]>);
  return linhas.map((l) => ({
    id: l.id,
    titulo: l.titulo,
    criado_em: l.criado_em,
    aluno: { id: l.alunos.id, nome: l.alunos.nome },
    turma: { nome: l.alunos.turmas.nome, cor: l.alunos.turmas.cor },
  }));
}

export async function renomearArquivo(sb: SupabaseClient, id: string, titulo: string): Promise<void> {
  checar(await sb.from('arquivos').update({ titulo }).eq('id', id));
}

export async function usoStorage(sb: SupabaseClient): Promise<number> {
  return Number(checar(await sb.rpc('uso_storage')) ?? 0);
}

export async function moverArquivo(
  sb: SupabaseClient,
  arquivo: Arquivo,
  destino: Pick<Aluno, 'id' | 'turma_id'>,
): Promise<void> {
  if (destino.id === arquivo.aluno_id) return;

  let turmaDaAtividade: string | null = null;
  if (arquivo.atividade_id) {
    const at = checar<{ turma_id: string }>(
      await sb.from('atividades').select('turma_id').eq('id', arquivo.atividade_id).single(),
    );
    turmaDaAtividade = at.turma_id;
  }

  const novoPdf = caminhoPdf(destino.id, arquivo.id);
  const pares: [string, string][] = [[arquivo.storage_path, novoPdf]];
  if (arquivo.tem_miniatura) pares.push([caminhoMiniatura(arquivo.storage_path), caminhoMiniatura(novoPdf)]);

  const bucket = sb.storage.from(BUCKET);
  const movidos: [string, string][] = [];
  const desfazer = async () => {
    for (const [de, para] of movidos) await bucket.move(para, de);
  };

  for (const [de, para] of pares) {
    const { error } = await bucket.move(de, para);
    if (error) {
      await desfazer();
      throw new Error(error.message);
    }
    movidos.push([de, para]);
  }

  const { error } = await sb
    .from('arquivos')
    .update({
      aluno_id: destino.id,
      storage_path: novoPdf,
      atividade_id: atividadeAposMover(arquivo.atividade_id, turmaDaAtividade, destino.turma_id),
    })
    .eq('id', arquivo.id);
  if (error) {
    await desfazer();
    throw new Error(error.message);
  }
}
