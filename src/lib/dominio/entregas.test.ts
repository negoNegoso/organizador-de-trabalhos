import { describe, expect, it } from 'vitest';
import { calcularEntregas, idsEntregues } from './entregas';

describe('idsEntregues', () => {
  it('soma o banco com os pendentes da mesma atividade', () => {
    const pendentes = [
      { alunoId: 'b', atividadeId: 'at1' },
      { alunoId: 'c', atividadeId: 'outra' },
      { alunoId: 'd', atividadeId: null },
    ];
    expect([...idsEntregues(['a'], pendentes, 'at1')].sort()).toEqual(['a', 'b']);
  });
});

describe('calcularEntregas', () => {
  it('separa quem entregou de quem falta, mantendo a ordem', () => {
    const alunos = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    expect(calcularEntregas(alunos, new Set(['b']))).toEqual({
      entregues: [{ id: 'b' }],
      faltam: [{ id: 'a' }, { id: 'c' }],
    });
  });
});
