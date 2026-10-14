import type { Cantos, Ponto } from './tipos';

function resolver(A: number[][], b: number[]): number[] {
  const n = b.length;
  const M = A.map((linha, i) => [...linha, b[i]]);
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let l = c + 1; l < n; l++) if (Math.abs(M[l][c]) > Math.abs(M[piv][c])) piv = l;
    if (Math.abs(M[piv][c]) < 1e-10) throw new Error('Cantos inválidos');
    [M[c], M[piv]] = [M[piv], M[c]];
    for (let l = 0; l < n; l++) {
      if (l === c) continue;
      const f = M[l][c] / M[c][c];
      for (let k = c; k <= n; k++) M[l][k] -= f * M[c][k];
    }
  }
  return M.map((linha, i) => linha[n] / linha[i]);
}

/** Matriz 3×3 (em linha) que leva `de[i]` em `para[i]`. */
export function homografia(de: Cantos, para: Cantos): number[] {
  const A: number[][] = [];
  const b: number[] = [];
  for (let i = 0; i < 4; i++) {
    const { x, y } = de[i];
    const { x: u, y: v } = para[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
    b.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
    b.push(v);
  }
  const h = resolver(A, b);
  if (h.some((v) => !Number.isFinite(v))) throw new Error('Cantos inválidos');
  return [...h, 1];
}

export function aplicarHomografia(h: number[], p: Ponto): Ponto {
  const w = h[6] * p.x + h[7] * p.y + h[8];
  return { x: (h[0] * p.x + h[1] * p.y + h[2]) / w, y: (h[3] * p.x + h[4] * p.y + h[5]) / w };
}
