import type { Cantos, Ponto } from './tipos';

export function cantosDaImagem(img: { width: number; height: number }): Cantos {
  return [
    { x: 0, y: 0 },
    { x: img.width, y: 0 },
    { x: img.width, y: img.height },
    { x: 0, y: img.height },
  ];
}

export function ordenarCantos(pts: Ponto[]): Cantos {
  if (pts.length !== 4) throw new Error('São necessários 4 pontos');
  const porSoma = [...pts].sort((a, b) => a.x + a.y - (b.x + b.y));
  const porDiferenca = [...pts].sort((a, b) => a.x - a.y - (b.x - b.y));
  return [porSoma[0], porDiferenca[3], porSoma[3], porDiferenca[0]];
}

export function escalarCantos(c: Cantos, fator: number): Cantos {
  return c.map((p) => ({ x: p.x * fator, y: p.y * fator })) as Cantos;
}

export function distanciaMaxima(a: Cantos, b: Cantos): number {
  return Math.max(...a.map((p, i) => Math.hypot(p.x - b[i].x, p.y - b[i].y)));
}
