import type { SupabaseClient } from '@supabase/supabase-js';
import type { AnoLetivo } from '../tipos';
import { checar } from './consulta';

const CAMPOS = 'id,ano,arquivado';

export async function listarAnos(sb: SupabaseClient): Promise<AnoLetivo[]> {
  return checar(await sb.from('anos_letivos').select(CAMPOS).order('ano', { ascending: false }));
}

export async function obterAno(sb: SupabaseClient, id: string): Promise<AnoLetivo> {
  return checar(await sb.from('anos_letivos').select(CAMPOS).eq('id', id).single());
}

export async function criarAno(sb: SupabaseClient, ano: number): Promise<AnoLetivo> {
  return checar(await sb.from('anos_letivos').insert({ ano }).select(CAMPOS).single(), {
    '23505': 'Esse ano já existe.',
    '23514': 'Ano inválido.',
  });
}

export async function definirArquivado(sb: SupabaseClient, id: string, arquivado: boolean): Promise<void> {
  checar(await sb.from('anos_letivos').update({ arquivado }).eq('id', id));
}
