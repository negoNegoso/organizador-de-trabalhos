'use client';

import { Check } from 'lucide-react';
import { CORES, ESTILO_COR, type CorTurma } from '@/lib/ui/cores';

export function SeletorCor({ valor, onMudar }: { valor: CorTurma; onMudar: (c: CorTurma) => void }) {
  return (
    <div role="radiogroup" aria-label="Cor da turma" className="flex flex-wrap gap-3">
      {CORES.map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={valor === c}
          aria-label={ESTILO_COR[c].nome}
          onClick={() => onMudar(c)}
          className={`flex h-11 w-11 items-center justify-center rounded-full text-white ${ESTILO_COR[c].forte} ${valor === c ? 'ring-4 ring-slate-300' : ''}`}
        >
          {valor === c && <Check aria-hidden className="h-5 w-5" />}
        </button>
      ))}
    </div>
  );
}
