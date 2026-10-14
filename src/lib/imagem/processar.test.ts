import { expect, it } from 'vitest';
import { cantosDaImagem } from './cantos';
import { processarImagem } from './processar';
import { criarImagem, pixel } from './teste-ajuda';

it('recorta, gira e aplica filtro na ordem certa', () => {
  const img = criarImagem(40, 20, () => [200, 100, 50]);
  const cor = processarImagem(img, cantosDaImagem(img), 90, 'cor', 1600);
  expect([cor.width, cor.height]).toEqual([20, 40]);
  expect(pixel(cor, 0, 0).slice(0, 3)).toEqual([200, 100, 50]);
  const doc = processarImagem(img, cantosDaImagem(img), 0, 'documento', 1600);
  const [r, g, b] = pixel(doc, 0, 0);
  expect(r).toBe(g);
  expect(g).toBe(b);
});
