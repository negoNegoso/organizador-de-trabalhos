import { expect, it } from 'vitest';
import { cantosDaImagem, distanciaMaxima, escalarCantos, ordenarCantos } from './cantos';

it('cantos da imagem inteira', () => {
  expect(cantosDaImagem({ width: 4, height: 3 })).toEqual([{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 3 }, { x: 0, y: 3 }]);
});

it('ordena pontos soltos em sup-esq, sup-dir, inf-dir, inf-esq', () => {
  const pts = [{ x: 90, y: 95 }, { x: 12, y: 8 }, { x: 5, y: 88 }, { x: 95, y: 3 }];
  expect(ordenarCantos(pts)).toEqual([{ x: 12, y: 8 }, { x: 95, y: 3 }, { x: 90, y: 95 }, { x: 5, y: 88 }]);
});

it('escala e mede deslocamento', () => {
  const c = cantosDaImagem({ width: 10, height: 10 });
  expect(escalarCantos(c, 2)[2]).toEqual({ x: 20, y: 20 });
  expect(distanciaMaxima(c, escalarCantos(c, 2))).toBeCloseTo(Math.hypot(10, 10));
});
