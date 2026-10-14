import type { Imagem } from './tipos';

/** Tons de cinza com contraste esticado: o papel (percentil 90) vira branco, a tinta (percentil 2) vira preto. */
export function filtroDocumento(img: Imagem): Imagem {
  const n = img.width * img.height;
  const cinza = new Uint8Array(n);
  const hist = new Uint32Array(256);
  for (let i = 0; i < n; i++) {
    const g = Math.round(0.299 * img.data[i * 4] + 0.587 * img.data[i * 4 + 1] + 0.114 * img.data[i * 4 + 2]);
    cinza[i] = g;
    hist[g]++;
  }
  const percentil = (p: number) => {
    const alvo = n * p;
    let acumulado = 0;
    for (let v = 0; v < 256; v++) {
      acumulado += hist[v];
      if (acumulado >= alvo) return v;
    }
    return 255;
  };
  const alto = percentil(0.9);
  let baixo = percentil(0.02);
  if (alto - baixo < 40) baixo = Math.max(0, alto - 40);
  const faixa = Math.max(1, alto - baixo);

  const out = new Uint8ClampedArray(n * 4);
  for (let i = 0; i < n; i++) {
    const v = ((cinza[i] - baixo) * 255) / faixa;
    out[i * 4] = v;
    out[i * 4 + 1] = v;
    out[i * 4 + 2] = v;
    out[i * 4 + 3] = 255;
  }
  return { data: out, width: img.width, height: img.height };
}
