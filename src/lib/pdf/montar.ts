import { PDFDocument } from 'pdf-lib';
import { layoutPagina } from './layout';

export type PaginaJpeg = { jpeg: Uint8Array; largura: number; altura: number };

export async function montarPdf(paginas: PaginaJpeg[]): Promise<Uint8Array> {
  if (!paginas.length) throw new Error('Nenhuma página');
  const doc = await PDFDocument.create();
  for (const p of paginas) {
    const imagem = await doc.embedJpg(p.jpeg);
    const l = layoutPagina(p.largura, p.altura);
    doc.addPage([l.larguraPagina, l.alturaPagina]).drawImage(imagem, { x: l.x, y: l.y, width: l.largura, height: l.altura });
  }
  return doc.save();
}
