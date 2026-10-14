import { expect, it } from 'vitest';
import { filtroDocumento } from './filtro';
import { criarImagem, pixel } from './teste-ajuda';

it('papel vira branco, texto vira preto, tudo em cinza', () => {
  // 10x10: primeira linha é "texto" (30), o resto é "papel" (200, levemente amarelado)
  const img = criarImagem(10, 10, (_x, y) => (y === 0 ? [30, 30, 30] : [210, 200, 180]));
  const r = filtroDocumento(img);
  expect(pixel(r, 5, 5)).toEqual([255, 255, 255, 255]);
  expect(pixel(r, 5, 0)).toEqual([0, 0, 0, 255]);
});

it('página quase em branco não divide por zero', () => {
  const r = filtroDocumento(criarImagem(4, 4, () => [200, 200, 200]));
  expect(pixel(r, 0, 0)).toEqual([255, 255, 255, 255]);
});
