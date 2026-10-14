import { ErroEnvio } from '../envio/erro';
import { processarImagem } from './processar';
import type { Filtro, Imagem, Pagina } from './tipos';

/** Decodifica (inclui HEIC no Safari e respeita a orientação EXIF) e reduz para lado maior ≤ maxLado. */
export async function blobParaImagem(blob: Blob, maxLado: number): Promise<Imagem> {
  const url = URL.createObjectURL(blob);
  let canvas: HTMLCanvasElement | null = null;
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const escala = Math.min(1, maxLado / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * escala));
    const h = Math.max(1, Math.round(img.naturalHeight * escala));
    canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0, w, h);
    return ctx.getImageData(0, 0, w, h);
  } catch {
    throw new ErroEnvio('Não consegui abrir esta imagem.');
  } finally {
    URL.revokeObjectURL(url);
    liberarCanvas(canvas);
  }
}

/** Libera a memória do bitmap (iOS limita a memória total de canvas). */
export function liberarCanvas(canvas: HTMLCanvasElement | null) {
  if (!canvas) return;
  canvas.width = 0;
  canvas.height = 0;
}

export function imagemParaCanvas(img: Imagem): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  canvas.getContext('2d')!.putImageData(new ImageData(img.data as Uint8ClampedArray<ArrayBuffer>, img.width, img.height), 0, 0);
  return canvas;
}

export async function imagemParaJpeg(img: Imagem, qualidade: number): Promise<Uint8Array> {
  const canvas = imagemParaCanvas(img);
  try {
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', qualidade));
    if (!blob) throw new Error('Falha ao gerar JPEG');
    return new Uint8Array(await blob.arrayBuffer());
  } finally {
    liberarCanvas(canvas);
  }
}

export async function processarPagina(p: Pagina, filtro: Filtro, maxLado: number): Promise<Imagem> {
  const img = await blobParaImagem(p.fonte, Infinity);
  return processarImagem(img, p.cantos, p.rotacao, filtro, maxLado);
}
