import { openDB } from 'idb';

export type Destino = { alunoId: string; atividadeId: string | null; titulo: string };

export type ItemFila = Destino & {
  id: string;
  paginas: number;
  pdf: Uint8Array;
  miniatura: Uint8Array | null;
  criadoEm: number;
  tentativas: number;
  ultimoErro: string | null;
};

export interface Fila {
  adicionar(item: ItemFila): Promise<void>;
  listar(): Promise<ItemFila[]>;
  remover(id: string): Promise<void>;
  registrarFalha(id: string, mensagem: string): Promise<void>;
}

const STORE = 'fila';

export async function abrirFila(nomeBanco = 'organizador'): Promise<Fila> {
  const db = await openDB(nomeBanco, 1, {
    upgrade(d) {
      d.createObjectStore(STORE, { keyPath: 'id' });
    },
  });
  return {
    async adicionar(item) {
      await db.put(STORE, item);
    },
    async listar() {
      const itens = (await db.getAll(STORE)) as ItemFila[];
      return itens.sort((a, b) => a.criadoEm - b.criadoEm);
    },
    async remover(id) {
      await db.delete(STORE, id);
    },
    async registrarFalha(id, mensagem) {
      const tx = db.transaction(STORE, 'readwrite');
      const item = (await tx.store.get(id)) as ItemFila | undefined;
      if (item) await tx.store.put({ ...item, tentativas: item.tentativas + 1, ultimoErro: mensagem });
      await tx.done;
    },
  };
}

export function novoItem(destino: Destino, pdf: Uint8Array, miniatura: Uint8Array | null, paginas: number): ItemFila {
  return { ...destino, id: crypto.randomUUID(), paginas, pdf, miniatura, criadoEm: Date.now(), tentativas: 0, ultimoErro: null };
}
