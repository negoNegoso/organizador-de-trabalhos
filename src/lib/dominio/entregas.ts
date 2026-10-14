export function idsEntregues(
  doBanco: string[],
  pendentes: { alunoId: string; atividadeId: string | null }[],
  atividadeId: string,
): Set<string> {
  const ids = new Set(doBanco);
  for (const p of pendentes) if (p.atividadeId === atividadeId) ids.add(p.alunoId);
  return ids;
}

export function calcularEntregas<A extends { id: string }>(alunos: A[], entregues: Set<string>) {
  return {
    entregues: alunos.filter((a) => entregues.has(a.id)),
    faltam: alunos.filter((a) => !entregues.has(a.id)),
  };
}
