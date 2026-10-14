export function mensagemErro(e: unknown): string {
  return e instanceof Error && e.message ? e.message : 'Erro inesperado. Tente de novo.';
}
