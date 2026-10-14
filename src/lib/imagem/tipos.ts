export type Imagem = { data: Uint8ClampedArray; width: number; height: number };
export type Ponto = { x: number; y: number };
/** Ordem: superior-esquerdo, superior-direito, inferior-direito, inferior-esquerdo. */
export type Cantos = [Ponto, Ponto, Ponto, Ponto];
export type Rotacao = 0 | 90 | 180 | 270;
export type Filtro = 'documento' | 'cor';

/** Uma página capturada e ainda não processada. `fonte` é JPEG com lado maior ≤ 2400 px. */
export type Pagina = {
  id: string;
  fonte: Blob;
  largura: number;
  altura: number;
  cantos: Cantos;
  rotacao: Rotacao;
  detectado: boolean;
};
