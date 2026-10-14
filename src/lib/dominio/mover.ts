export function atividadeAposMover(
  atividadeId: string | null,
  turmaDaAtividade: string | null,
  turmaDestino: string,
): string | null {
  return atividadeId && turmaDaAtividade === turmaDestino ? atividadeId : null;
}
