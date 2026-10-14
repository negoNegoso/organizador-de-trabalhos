import { novoItem, type Destino, type ItemFila } from '../fila/fila';
import { imagemParaJpeg } from '../imagem/navegador';
import { redimensionar } from '../imagem/retificar';
import type { Imagem } from '../imagem/tipos';
import { miniaturaDePdf } from '../pdf/miniatura';
import { montarPdf, type PaginaJpeg } from '../pdf/montar';
import { validarPdf } from '../pdf/validar';

/** Gera uma página por vez (evita guardar todas as imagens grandes na memória). */
export async function itemDeImagens(gerar: Array<() => Promise<Imagem>>, destino: Destino): Promise<ItemFila> {
  const paginas: PaginaJpeg[] = [];
  let miniatura: Uint8Array | null = null;
  for (const [i, gerarPagina] of gerar.entries()) {
    const img = await gerarPagina();
    paginas.push({ jpeg: await imagemParaJpeg(img, 0.7), largura: img.width, altura: img.height });
    if (i === 0) miniatura = await imagemParaJpeg(redimensionar(img, 300), 0.7);
  }
  return novoItem(destino, await montarPdf(paginas), miniatura, paginas.length);
}

export async function itemDePdf(bytes: Uint8Array, destino: Destino): Promise<ItemFila> {
  const { paginas } = await validarPdf(bytes);
  return novoItem(destino, bytes, await miniaturaDePdf(bytes), paginas);
}
