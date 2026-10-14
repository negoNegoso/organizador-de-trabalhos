import type { Imagem, Rotacao } from './tipos';

function girar90({ data, width: W, height: H }: Imagem): Imagem {
  const out = new Uint8ClampedArray(data.length);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const o = (x * H + (H - 1 - y)) * 4;
      out[o] = data[i];
      out[o + 1] = data[i + 1];
      out[o + 2] = data[i + 2];
      out[o + 3] = data[i + 3];
    }
  }
  return { data: out, width: H, height: W };
}

/** Gira no sentido horário. */
export function rotacionar(img: Imagem, graus: Rotacao): Imagem {
  let r = img;
  for (let i = 0; i < graus / 90; i++) r = girar90(r);
  return r;
}
