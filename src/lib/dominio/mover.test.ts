import { expect, it } from 'vitest';
import { atividadeAposMover } from './mover';

it('mantém a atividade se o destino é da mesma turma', () => {
  expect(atividadeAposMover('at1', 'turmaA', 'turmaA')).toBe('at1');
});

it('remove a atividade se o destino é de outra turma', () => {
  expect(atividadeAposMover('at1', 'turmaA', 'turmaB')).toBeNull();
});

it('sem atividade continua sem atividade', () => {
  expect(atividadeAposMover(null, null, 'turmaB')).toBeNull();
});
