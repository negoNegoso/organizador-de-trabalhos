import { expect, it } from 'vitest';
import { rotacionar } from './rotacao';
import { criarImagem, pixel } from './teste-ajuda';

const img = criarImagem(2, 1, (x) => (x === 0 ? [10, 0, 0] : [20, 0, 0])); // [A B]

it('90° no sentido horário: A em cima, B embaixo', () => {
  const r = rotacionar(img, 90);
  expect([r.width, r.height]).toEqual([1, 2]);
  expect(pixel(r, 0, 0)[0]).toBe(10);
  expect(pixel(r, 0, 1)[0]).toBe(20);
});

it('180° inverte a ordem; 0° não muda', () => {
  const r = rotacionar(img, 180);
  expect([pixel(r, 0, 0)[0], pixel(r, 1, 0)[0]]).toEqual([20, 10]);
  expect(rotacionar(img, 0)).toBe(img);
});
