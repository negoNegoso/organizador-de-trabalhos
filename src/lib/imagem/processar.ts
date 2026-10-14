import { filtroDocumento } from './filtro';
import { retificar } from './retificar';
import { rotacionar } from './rotacao';
import type { Cantos, Filtro, Imagem, Rotacao } from './tipos';

export function processarImagem(
  img: Imagem,
  cantos: Cantos,
  rotacao: Rotacao,
  filtro: Filtro,
  maxLado: number,
): Imagem {
  const r = rotacionar(retificar(img, cantos, maxLado), rotacao);
  return filtro === 'documento' ? filtroDocumento(r) : r;
}
