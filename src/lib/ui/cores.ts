export const CORES = ['azul', 'verde', 'laranja', 'roxo', 'rosa', 'ciano', 'ambar', 'vermelho'] as const;
export type CorTurma = (typeof CORES)[number];

type Estilo = { nome: string; forte: string; suave: string; texto: string; ponto: string };

// Classes completas (o Tailwind só gera classes que aparecem literais no código).
export const ESTILO_COR: Record<CorTurma, Estilo> = {
  azul: { nome: 'Azul', forte: 'bg-blue-600', suave: 'bg-blue-100', texto: 'text-blue-800', ponto: 'bg-blue-500' },
  verde: { nome: 'Verde', forte: 'bg-green-600', suave: 'bg-green-100', texto: 'text-green-800', ponto: 'bg-green-500' },
  laranja: { nome: 'Laranja', forte: 'bg-orange-600', suave: 'bg-orange-100', texto: 'text-orange-800', ponto: 'bg-orange-500' },
  roxo: { nome: 'Roxo', forte: 'bg-purple-600', suave: 'bg-purple-100', texto: 'text-purple-800', ponto: 'bg-purple-500' },
  rosa: { nome: 'Rosa', forte: 'bg-pink-600', suave: 'bg-pink-100', texto: 'text-pink-800', ponto: 'bg-pink-500' },
  ciano: { nome: 'Ciano', forte: 'bg-cyan-700', suave: 'bg-cyan-100', texto: 'text-cyan-800', ponto: 'bg-cyan-500' },
  ambar: { nome: 'Âmbar', forte: 'bg-amber-600', suave: 'bg-amber-100', texto: 'text-amber-900', ponto: 'bg-amber-500' },
  vermelho: { nome: 'Vermelho', forte: 'bg-red-600', suave: 'bg-red-100', texto: 'text-red-800', ponto: 'bg-red-500' },
};

export function ehCor(v: string): v is CorTurma {
  return (CORES as readonly string[]).includes(v);
}

/** Primeira cor menos usada no ano (empate → ordem da paleta). */
export function sugerirCor(usadas: CorTurma[]): CorTurma {
  const contagem = new Map<CorTurma, number>(CORES.map((c) => [c, 0]));
  for (const c of usadas) contagem.set(c, (contagem.get(c) ?? 0) + 1);
  let melhor: CorTurma = CORES[0];
  for (const c of CORES) if (contagem.get(c)! < contagem.get(melhor)!) melhor = c;
  return melhor;
}
