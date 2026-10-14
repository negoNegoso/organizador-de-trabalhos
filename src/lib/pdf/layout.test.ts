import { expect, it } from 'vitest';
import { A4, layoutPagina } from './layout';

it('imagem em pé ocupa a largura de um A4 retrato', () => {
  const l = layoutPagina(1000, 1414);
  expect([l.larguraPagina, l.alturaPagina]).toEqual([A4.largura, A4.altura]);
  expect(l.largura).toBeCloseTo(A4.largura, 1);
  expect(l.x).toBeCloseTo(0, 1);
});

it('imagem deitada vira A4 paisagem, centralizada na vertical', () => {
  const l = layoutPagina(2000, 1000);
  expect([l.larguraPagina, l.alturaPagina]).toEqual([A4.altura, A4.largura]);
  expect(l.largura).toBeCloseTo(A4.altura, 2);
  expect(l.altura).toBeCloseTo(A4.altura / 2, 2);
  expect(l.y).toBeCloseTo((A4.largura - A4.altura / 2) / 2, 2);
});
