import { cantosDaImagem } from './cantos';
import { aplicarHomografia, homografia } from './homografia';
import type { Cantos, Imagem, Ponto } from './tipos';

const dist = (a: Ponto, b: Ponto) => Math.hypot(a.x - b.x, a.y - b.y);

export function tamanhoRetificado(c: Cantos, maxLado: number): { largura: number; altura: number } {
  const largura = Math.max(dist(c[0], c[1]), dist(c[3], c[2]));
  const altura = Math.max(dist(c[0], c[3]), dist(c[1], c[2]));
  const escala = Math.min(1, maxLado / Math.max(largura, altura));
  return {
    largura: Math.max(1, Math.round(largura * escala)),
    altura: Math.max(1, Math.round(altura * escala)),
  };
}

/** Recorta o quadrilátero `cantos` e o endireita num retângulo (lado maior ≤ maxLado). */
export function retificar(img: Imagem, cantos: Cantos, maxLado: number): Imagem {
  const [a, b, c, d] = cantos;
  if (Math.min(dist(a, b), dist(d, c), dist(a, d), dist(b, c)) < 1) throw new Error('Cantos inválidos');
  const { largura, altura } = tamanhoRetificado(cantos, maxLado);
  const h = homografia(cantosDaImagem({ width: largura, height: altura }), cantos);
  const { data, width: W, height: H } = img;
  const out = new Uint8ClampedArray(largura * altura * 4);

  for (let v = 0; v < altura; v++) {
    for (let u = 0; u < largura; u++) {
      const p = aplicarHomografia(h, { x: u + 0.5, y: v + 0.5 });
      const x = Math.min(Math.max(p.x - 0.5, 0), W - 1);
      const y = Math.min(Math.max(p.y - 0.5, 0), H - 1);
      const x0 = Math.floor(x);
      const y0 = Math.floor(y);
      const x1 = Math.min(x0 + 1, W - 1);
      const y1 = Math.min(y0 + 1, H - 1);
      const fx = x - x0;
      const fy = y - y0;
      const o = (v * largura + u) * 4;
      for (let c = 0; c < 4; c++) {
        const a = data[(y0 * W + x0) * 4 + c];
        const b = data[(y0 * W + x1) * 4 + c];
        const d = data[(y1 * W + x0) * 4 + c];
        const e = data[(y1 * W + x1) * 4 + c];
        out[o + c] = (a * (1 - fx) + b * fx) * (1 - fy) + (d * (1 - fx) + e * fx) * fy;
      }
    }
  }
  return { data: out, width: largura, height: altura };
}

export function redimensionar(img: Imagem, maxLado: number): Imagem {
  return retificar(img, cantosDaImagem(img), maxLado);
}
