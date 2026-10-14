import { expect, it } from 'vitest';
import type { Arquivo, Atividade } from '../tipos';
import { agruparPorAtividade } from './agrupar';

const arq = (id: string, atividade_id: string | null): Arquivo => ({
  id, aluno_id: 'al', atividade_id, titulo: id, storage_path: `al/${id}.pdf`,
  paginas: 1, tamanho_bytes: 1, tem_miniatura: false, criado_em: '2026-10-14T00:00:00Z',
});
const atividades: Atividade[] = [
  { id: 'p2', turma_id: 't', nome: 'Prova 2', data: null },
  { id: 'p1', turma_id: 't', nome: 'Prova 1', data: null },
  { id: 'vazia', turma_id: 't', nome: 'Sem arquivos', data: null },
];

it('agrupa na ordem das atividades, omite vazias e põe o resto em Outros', () => {
  const grupos = agruparPorAtividade([arq('x', 'p1'), arq('y', null), arq('z', 'p2'), arq('w', 'apagada')], atividades);
  expect(grupos.map((g) => [g.titulo, g.arquivos.map((a) => a.id)])).toEqual([
    ['Prova 2', ['z']],
    ['Prova 1', ['x']],
    ['Outros', ['y', 'w']],
  ]);
});
