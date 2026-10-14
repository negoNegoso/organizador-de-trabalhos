import { expect, it } from 'vitest';
import { aplicarHomografia, homografia } from './homografia';
import type { Cantos } from './tipos';

const quadrado: Cantos = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }];
const trapezio: Cantos = [{ x: 10, y: 20 }, { x: 90, y: 5 }, { x: 110, y: 95 }, { x: -5, y: 80 }];

it('leva cada canto de origem ao canto de destino', () => {
  const h = homografia(quadrado, trapezio);
  quadrado.forEach((p, i) => {
    const q = aplicarHomografia(h, p);
    expect(q.x).toBeCloseTo(trapezio[i].x, 6);
    expect(q.y).toBeCloseTo(trapezio[i].y, 6);
  });
});

it('identidade quando origem e destino são iguais', () => {
  const q = aplicarHomografia(homografia(quadrado, quadrado), { x: 37, y: 12 });
  expect(q.x).toBeCloseTo(37, 9);
  expect(q.y).toBeCloseTo(12, 9);
});

it('recusa origem degenerada', () => {
  const ponto: Cantos = [{ x: 1, y: 1 }, { x: 1, y: 1 }, { x: 1, y: 1 }, { x: 1, y: 1 }];
  expect(() => homografia(ponto, quadrado)).toThrow('Cantos inválidos');
});
