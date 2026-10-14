/**
 * Executa `fn` uma de cada vez. Chamadas feitas durante uma execução
 * colapsam em uma única nova execução ao final (nunca em loop por falhas).
 */
export function criarExecutorUnico(fn: () => Promise<void>): () => Promise<void> {
  let atual: Promise<void> | null = null;
  let pendente = false;
  return () => {
    if (atual) {
      pendente = true;
      return atual;
    }
    atual = (async () => {
      try {
        do {
          pendente = false;
          await fn();
        } while (pendente);
      } finally {
        atual = null;
      }
    })();
    return atual;
  };
}
