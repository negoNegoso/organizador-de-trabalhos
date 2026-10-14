import { COOKIE_ANO } from './ano';

/** Lembra o ano escolhido no Início (lido pelo servidor). */
export function salvarAnoEscolhido(id: string): void {
  document.cookie = `${COOKIE_ANO}=${encodeURIComponent(id)}; path=/; max-age=31536000; samesite=lax`;
}
