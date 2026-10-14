'use client';

import { useFila } from '@/lib/fila/useFila';

/** Reserva, no fim da página, o espaço da faixa de pendentes (fixa na tela). */
export function EspacoFila() {
  const { itens } = useFila();
  if (!itens.length) return null;
  return <div aria-hidden className="h-16" />;
}
