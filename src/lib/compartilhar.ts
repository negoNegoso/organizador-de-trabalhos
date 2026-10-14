import { openDB } from 'idb';

const BANCO = 'organizador-compartilhados';
const STORE = 'arquivos';

type Guardado = { nome: string; tipo: string; dados: ArrayBuffer };

function abrir(banco: string) {
  return openDB(banco, 1, {
    upgrade(db) {
      db.createObjectStore(STORE, { autoIncrement: true });
    },
  });
}

/** Mesmo formato que o public/sw.js grava. */
export async function guardarCompartilhados(itens: Guardado[], banco = BANCO): Promise<void> {
  const db = await abrir(banco);
  const tx = db.transaction(STORE, 'readwrite');
  await tx.store.clear();
  for (const item of itens) await tx.store.add(item);
  await tx.done;
  db.close();
}

export async function lerCompartilhados(banco = BANCO): Promise<File[]> {
  const db = await abrir(banco);
  const itens = (await db.getAll(STORE)) as Guardado[];
  db.close();
  return itens.map((i) => new File([i.dados], i.nome, { type: i.tipo }));
}

export async function limparCompartilhados(banco = BANCO): Promise<void> {
  const db = await abrir(banco);
  await db.clear(STORE);
  db.close();
}
