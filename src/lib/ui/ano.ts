import type { AnoLetivo } from '../tipos';

export const COOKIE_ANO = 'ano_id';

/** Cookie válido → esse ano; senão o mais recente não arquivado; senão o mais recente. */
export function escolherAno(anos: AnoLetivo[], cookieId: string | undefined): AnoLetivo | null {
  if (!anos.length) return null;
  const doCookie = cookieId ? anos.find((a) => a.id === cookieId) : undefined;
  if (doCookie) return doCookie;
  const ordenados = [...anos].sort((a, b) => b.ano - a.ano);
  return ordenados.find((a) => !a.arquivado) ?? ordenados[0];
}
