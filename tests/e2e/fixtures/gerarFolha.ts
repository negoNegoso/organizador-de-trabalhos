import { writeFileSync } from 'node:fs';

const W = 640;
const H = 480;
// Folha levemente inclinada (sup-esq, sup-dir, inf-dir, inf-esq), clara sobre fundo escuro.
const quad = [[180, 70], [470, 50], [500, 430], [150, 410]];

function dentro(x: number, y: number): boolean {
  for (let i = 0; i < 4; i++) {
    const [ax, ay] = quad[i];
    const [bx, by] = quad[(i + 1) % 4];
    if ((bx - ax) * (y - ay) - (by - ay) * (x - ax) < 0) return false;
  }
  return true;
}

/** Grava um quadro Y4M (YUV 4:2:0) que o Chromium usa como câmera falsa. */
export function gerarFolha(caminho: string): void {
  const y = Buffer.alloc(W * H);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) y[j * W + i] = dentro(i, j) ? 235 : 40;
  const uv = Buffer.alloc((W / 2) * (H / 2), 128);
  writeFileSync(
    caminho,
    Buffer.concat([Buffer.from(`YUV4MPEG2 W${W} H${H} F30:1 Ip A1:1 C420jpeg\n`), Buffer.from('FRAME\n'), y, uv, uv]),
  );
}
