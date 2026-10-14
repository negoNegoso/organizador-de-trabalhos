import type { SupabaseClient } from '@supabase/supabase-js';
import type { Escopo } from '../tipos';
import { buscarTodos, checar } from './consulta';
import { caminhosDoArquivo, removerObjetos } from './storage';

const TABELA = { arquivo: 'arquivos', aluno: 'alunos', turma: 'turmas', ano: 'anos_letivos' } as const;

type Linha = { storage_path: string; tem_miniatura: boolean };

function arquivosDoEscopo(sb: SupabaseClient, e: Escopo): Promise<Linha[]> {
  return buscarTodos<Linha>((de, ate) => {
    switch (e.tipo) {
      case 'arquivo':
        return sb.from('arquivos').select('storage_path,tem_miniatura').eq('id', e.id).order('id').range(de, ate);
      case 'aluno':
        return sb.from('arquivos').select('storage_path,tem_miniatura').eq('aluno_id', e.id).order('id').range(de, ate);
      case 'turma':
        return sb
          .from('arquivos')
          .select('storage_path,tem_miniatura,alunos!inner(turma_id)')
          .eq('alunos.turma_id', e.id)
          .order('id')
          .range(de, ate);
      case 'ano':
        return sb
          .from('arquivos')
          .select('storage_path,tem_miniatura,alunos!inner(turmas!inner(ano_letivo_id))')
          .eq('alunos.turmas.ano_letivo_id', e.id)
          .order('id')
          .range(de, ate);
    }
  });
}

export async function contarArquivos(sb: SupabaseClient, e: Escopo): Promise<number> {
  return (await arquivosDoEscopo(sb, e)).length;
}

/** Remove os objetos do Storage e depois a linha (o banco apaga os filhos em cascata). */
export async function apagar(sb: SupabaseClient, e: Escopo): Promise<void> {
  const linhas = await arquivosDoEscopo(sb, e);
  await removerObjetos(sb, linhas.flatMap(caminhosDoArquivo));
  checar(await sb.from(TABELA[e.tipo]).delete().eq('id', e.id));
}
