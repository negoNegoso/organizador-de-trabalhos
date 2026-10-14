import { expect, it } from 'vitest';
import { cantosDaImagem } from './cantos';
import { redimensionar, retificar, tamanhoRetificado } from './retificar';
import { criarImagem, pixel } from './teste-ajuda';

it('com os cantos da imagem inteira devolve a mesma imagem', () => {
  const img = criarImagem(4, 3, (x, y) => [x * 50, y * 80, 7]);
  const r = retificar(img, cantosDaImagem(img), 100);
  expect([r.width, r.height]).toEqual([4, 3]);
  for (let y = 0; y < 3; y++) for (let x = 0; x < 4; x++) {
    pixel(r, x, y).forEach((v, i) => expect(Math.abs(v - pixel(img, x, y)[i])).toBeLessThanOrEqual(1));
  }
});

it('recorta só a região dos cantos', () => {
  const img = criarImagem(10, 10, (x, y) => (x >= 2 && x < 6 && y >= 2 && y < 6 ? [255, 255, 255] : [0, 0, 0]));
  const r = retificar(img, [{ x: 2, y: 2 }, { x: 6, y: 2 }, { x: 6, y: 6 }, { x: 2, y: 6 }], 100);
  expect([r.width, r.height]).toEqual([4, 4]);
  for (let i = 0; i < r.data.length; i += 4) expect(r.data[i]).toBe(255);
});

it('recusa cantos colapsados num ponto', () => {
  const img = criarImagem(10, 10, () => [0, 0, 0]);
  const p = { x: 5, y: 5 };
  expect(() => retificar(img, [p, p, p, p], 100)).toThrow('Cantos inválidos');
});

it('limita o lado maior sem ampliar', () => {
  expect(tamanhoRetificado(cantosDaImagem({ width: 200, height: 100 }), 50)).toEqual({ largura: 50, altura: 25 });
  expect(tamanhoRetificado(cantosDaImagem({ width: 20, height: 10 }), 50)).toEqual({ largura: 20, altura: 10 });
  const r = redimensionar(criarImagem(200, 100, () => [9, 9, 9]), 50);
  expect([r.width, r.height]).toEqual([50, 25]);
});
