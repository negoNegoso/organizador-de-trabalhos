export const A4 = { largura: 595.28, altura: 841.89 };

export function layoutPagina(largura: number, altura: number) {
  const paisagem = largura > altura;
  const larguraPagina = paisagem ? A4.altura : A4.largura;
  const alturaPagina = paisagem ? A4.largura : A4.altura;
  const escala = Math.min(larguraPagina / largura, alturaPagina / altura);
  const w = largura * escala;
  const h = altura * escala;
  return { larguraPagina, alturaPagina, x: (larguraPagina - w) / 2, y: (alturaPagina - h) / 2, largura: w, altura: h };
}
