export type Resposta<T> = { data: T | null; error: { message: string; code?: string } | null };

export function checar<T>(r: Resposta<T>, mensagens: Record<string, string> = {}): T {
  if (r.error) throw new Error((r.error.code && mensagens[r.error.code]) || r.error.message);
  return r.data as T;
}

/** Busca todas as linhas, página por página (o PostgREST limita a 1000 por resposta). */
export async function buscarTodos<T>(
  consulta: (de: number, ate: number) => PromiseLike<Resposta<T[]>>,
  lote = 1000,
): Promise<T[]> {
  const todos: T[] = [];
  for (let de = 0; ; de += lote) {
    const pagina = checar(await consulta(de, de + lote - 1)) ?? [];
    todos.push(...pagina);
    if (pagina.length < lote) return todos;
  }
}
