import type { SupabaseClient } from '@supabase/supabase-js';
import type { Atividade, AtividadeDetalhe } from '../tipos';
import { buscarTodos, checar } from './consulta';

const CAMPOS = 'id,turma_id,nome,data';

export async function listarAtividades(sb: SupabaseClient, turmaId: string): Promise<Atividade[]> {
  return checar(
    await sb
      .from('atividades')
      .select(CAMPOS)
      .eq('turma_id', turmaId)
      .order('data', { ascending: false, nullsFirst: false })
      .order('criado_em', { ascending: false }),
  );
}

export async function obterAtividade(sb: SupabaseClient, id: string): Promise<AtividadeDetalhe> {
  return checar(await sb.from('atividades').select(`${CAMPOS},turmas(id,nome)`).eq('id', id).single());
}

export async function criarAtividade(
  sb: SupabaseClient,
  turmaId: string,
  nome: string,
  data: string | null,
): Promise<Atividade> {
  return checar(await sb.from('atividades').insert({ turma_id: turmaId, nome, data }).select(CAMPOS).single());
}

export async function renomearAtividade(sb: SupabaseClient, id: string, nome: string): Promise<void> {
  checar(await sb.from('atividades').update({ nome }).eq('id', id));
}

/** Os arquivos continuam com o aluno (atividade_id vira nulo, título é mantido). */
export async function apagarAtividade(sb: SupabaseClient, id: string): Promise<void> {
  checar(await sb.from('atividades').delete().eq('id', id));
}

export async function alunosComEntrega(sb: SupabaseClient, atividadeId: string): Promise<string[]> {
  const linhas = await buscarTodos<{ aluno_id: string }>((de, ate) =>
    sb.from('arquivos').select('aluno_id').eq('atividade_id', atividadeId).order('id').range(de, ate),
  );
  return [...new Set(linhas.map((l) => l.aluno_id))];
}

export async function entregasDaTurma(sb: SupabaseClient, turmaId: string): Promise<Record<string, string[]>> {
  const linhas = await buscarTodos<{ atividade_id: string; aluno_id: string }>((de, ate) =>
    sb
      .from('arquivos')
      .select('atividade_id,aluno_id,atividades!inner(turma_id)')
      .eq('atividades.turma_id', turmaId)
      .order('id')
      .range(de, ate),
  );
  const mapa: Record<string, string[]> = {};
  for (const l of linhas) {
    const lista = (mapa[l.atividade_id] ??= []);
    if (!lista.includes(l.aluno_id)) lista.push(l.aluno_id);
  }
  return mapa;
}
