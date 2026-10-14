import type { Fila, ItemFila } from './fila';

export type Enviar = (item: ItemFila) => Promise<void>;

/** Envia cada item; só remove da fila o que o servidor confirmou. */
export async function processarFila(fila: Fila, enviar: Enviar, aoMudar?: () => void) {
  let enviados = 0;
  let falhas = 0;
  for (const item of await fila.listar()) {
    try {
      await enviar(item);
      await fila.remover(item.id);
      enviados++;
    } catch (e) {
      await fila.registrarFalha(item.id, e instanceof Error ? e.message : String(e));
      falhas++;
    }
    aoMudar?.();
  }
  return { enviados, falhas };
}
