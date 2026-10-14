import type { SupabaseClient } from '@supabase/supabase-js';
import type { AnoLetivo, Turma, TurmaComAno, TurmaComContagem, TurmaDetalhe } from '../tipos';
import type { CorTurma } from '../ui/cores';
import { checar, type Resposta } from './consulta';

const CAMPOS = 'id,ano_letivo_id,nome,cor';

type ComContagem = Turma & { alunos: { count: number }[] };
const contar = ({ alunos, ...t }: ComContagem): TurmaComContagem => ({ ...t, total_alunos: alunos[0]?.count ?? 0 });

export async function listarTurmas(sb: SupabaseClient, anoId: string): Promise<Turma[]> {
  return checar(await sb.from('turmas').select(CAMPOS).eq('ano_letivo_id', anoId).order('nome'));
}

export async function listarTurmasComContagem(sb: SupabaseClient, anoId: string): Promise<TurmaComContagem[]> {
  const linhas = checar<ComContagem[]>(
    await sb.from('turmas').select(`${CAMPOS},alunos(count)`).eq('ano_letivo_id', anoId).order('nome'),
  );
  return linhas.map(contar);
}

/** Todas as turmas, do ano mais recente para o mais antigo e por nome dentro do ano. */
export async function listarTurmasPorAno(sb: SupabaseClient): Promise<TurmaComAno[]> {
  type Linha = ComContagem & { anos_letivos: AnoLetivo };
  const resposta = await sb.from('turmas').select(`${CAMPOS},alunos(count),anos_letivos(id,ano,arquivado)`);
  // Sem tipos gerados, o supabase-js infere relações como arrays; aqui é to-one.
  const linhas = checar(resposta as unknown as Resposta<Linha[]>);
  return linhas
    .map(({ anos_letivos, ...t }) => ({ ...contar(t), ano: anos_letivos }))
    .sort((a, b) => b.ano.ano - a.ano.ano || a.nome.localeCompare(b.nome, 'pt-BR'));
}

export async function obterTurma(sb: SupabaseClient, id: string): Promise<TurmaDetalhe> {
  return checar(await sb.from('turmas').select(`${CAMPOS},anos_letivos(ano)`).eq('id', id).single());
}

export async function criarTurma(sb: SupabaseClient, anoId: string, nome: string, cor?: CorTurma): Promise<Turma> {
  // Sem `cor`, o banco aplica o padrão (azul).
  const valores: Record<string, string> = { ano_letivo_id: anoId, nome, ...(cor && { cor }) };
  return checar(await sb.from('turmas').insert(valores).select(CAMPOS).single());
}

export async function renomearTurma(sb: SupabaseClient, id: string, nome: string): Promise<void> {
  checar(await sb.from('turmas').update({ nome }).eq('id', id));
}

export async function definirCorTurma(sb: SupabaseClient, id: string, cor: CorTurma): Promise<void> {
  checar(await sb.from('turmas').update({ cor }).eq('id', id));
}
