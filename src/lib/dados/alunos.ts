import type { SupabaseClient } from '@supabase/supabase-js';
import { normalizar } from '../dominio/busca';
import type { Aluno, AlunoComContagem, AlunoDetalhe, ResultadoBusca } from '../tipos';
import type { CorTurma } from '../ui/cores';
import { checar, type Resposta } from './consulta';

const CAMPOS = 'id,turma_id,nome';

export async function listarAlunos(sb: SupabaseClient, turmaId: string): Promise<AlunoComContagem[]> {
  const linhas = checar<(Aluno & { arquivos: { count: number }[] })[]>(
    await sb.from('alunos').select(`${CAMPOS},arquivos(count)`).eq('turma_id', turmaId).order('nome'),
  );
  return linhas.map(({ arquivos, ...a }) => ({ ...a, total_arquivos: arquivos[0]?.count ?? 0 }));
}

export async function obterAluno(sb: SupabaseClient, id: string): Promise<AlunoDetalhe> {
  return checar(
    await sb.from('alunos').select(`${CAMPOS},turmas(id,nome,cor,ano_letivo_id,anos_letivos(ano))`).eq('id', id).single(),
  );
}

export async function criarAlunos(sb: SupabaseClient, turmaId: string, nomes: string[]): Promise<Aluno[]> {
  if (!nomes.length) return [];
  return checar(
    await sb.from('alunos').insert(nomes.map((nome) => ({ turma_id: turmaId, nome }))).select(CAMPOS),
  );
}

export async function renomearAluno(sb: SupabaseClient, id: string, nome: string): Promise<void> {
  checar(await sb.from('alunos').update({ nome }).eq('id', id));
}

export async function buscarAlunos(sb: SupabaseClient, termo: string): Promise<ResultadoBusca[]> {
  const t = normalizar(termo);
  if (t.length < 2) return [];
  const padrao = `%${t.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  type Linha = { id: string; nome: string; turmas: { id: string; nome: string; cor: CorTurma; anos_letivos: { ano: number } } };
  const resposta = await sb
    .from('alunos')
    .select('id,nome,turmas(id,nome,cor,anos_letivos(ano))')
    .ilike('nome_busca', padrao)
    .order('nome')
    .limit(30);
  // Sem tipos gerados, o supabase-js infere relações como arrays; aqui são to-one.
  const linhas = checar(resposta as unknown as Resposta<Linha[]>);
  return linhas.map((l) => ({
    id: l.id,
    nome: l.nome,
    turma: { id: l.turmas.id, nome: l.turmas.nome, cor: l.turmas.cor },
    ano: l.turmas.anos_letivos.ano,
  }));
}
