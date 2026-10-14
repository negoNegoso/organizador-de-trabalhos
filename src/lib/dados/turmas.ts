import type { SupabaseClient } from '@supabase/supabase-js';
import type { Turma, TurmaDetalhe } from '../tipos';
import { checar } from './consulta';

const CAMPOS = 'id,ano_letivo_id,nome';

export async function listarTurmas(sb: SupabaseClient, anoId: string): Promise<Turma[]> {
  return checar(await sb.from('turmas').select(CAMPOS).eq('ano_letivo_id', anoId).order('nome'));
}

export async function obterTurma(sb: SupabaseClient, id: string): Promise<TurmaDetalhe> {
  return checar(await sb.from('turmas').select(`${CAMPOS},anos_letivos(ano)`).eq('id', id).single());
}

export async function criarTurma(sb: SupabaseClient, anoId: string, nome: string): Promise<Turma> {
  return checar(await sb.from('turmas').insert({ ano_letivo_id: anoId, nome }).select(CAMPOS).single());
}

export async function renomearTurma(sb: SupabaseClient, id: string, nome: string): Promise<void> {
  checar(await sb.from('turmas').update({ nome }).eq('id', id));
}
