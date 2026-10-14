import type { Arquivo, Atividade } from '../tipos';

export type Grupo = { chave: string; titulo: string; arquivos: Arquivo[] };

export function agruparPorAtividade(arquivos: Arquivo[], atividades: Atividade[]): Grupo[] {
  const grupos: Grupo[] = atividades
    .map((a) => ({ chave: a.id, titulo: a.nome, arquivos: arquivos.filter((f) => f.atividade_id === a.id) }))
    .filter((g) => g.arquivos.length > 0);
  const ids = new Set(atividades.map((a) => a.id));
  const outros = arquivos.filter((f) => !f.atividade_id || !ids.has(f.atividade_id));
  if (outros.length) grupos.push({ chave: 'outros', titulo: 'Outros', arquivos: outros });
  return grupos;
}
