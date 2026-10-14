import jpeg from 'jpeg-js';
import { PDFDocument } from 'pdf-lib';
import { expect, it } from 'vitest';
import { A4 } from './layout';
import { montarPdf, type PaginaJpeg } from './montar';

function jpegDeTeste(largura: number, altura: number): PaginaJpeg {
  const data = Buffer.alloc(largura * altura * 4, 200);
  return { jpeg: new Uint8Array(jpeg.encode({ data, width: largura, height: altura }, 70).data), largura, altura };
}

it('gera uma página A4 por imagem, respeitando a orientação e a ordem', async () => {
  const bytes = await montarPdf([jpegDeTeste(30, 40), jpegDeTeste(40, 30)]);
  const doc = await PDFDocument.load(bytes);
  expect(doc.getPageCount()).toBe(2);
  const [p1, p2] = doc.getPages().map((p) => p.getSize());
  expect([p1.width, p1.height]).toEqual([A4.largura, A4.altura]);
  expect([p2.width, p2.height]).toEqual([A4.altura, A4.largura]);
});

it('recusa lista vazia', async () => {
  await expect(montarPdf([])).rejects.toThrow('Nenhuma página');
});
