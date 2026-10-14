import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { ESTILO_COR, type CorTurma } from '@/lib/ui/cores';

type Props = { href: string; titulo: string; detalhe?: ReactNode; ponto?: CorTurma };

export function ItemLista({ href, titulo, detalhe, ponto }: Props) {
  return (
    <Link href={href} className="flex min-h-12 items-center gap-3 px-3 py-2">
      {ponto && <span aria-hidden className={`h-3 w-3 shrink-0 rounded-full ${ESTILO_COR[ponto].ponto}`} />}
      <span className="min-w-0 flex-1 truncate">{titulo}</span>
      {detalhe && <span className="shrink-0 text-sm text-slate-500">{detalhe}</span>}
      <ChevronRight aria-hidden className="h-4 w-4 shrink-0 text-slate-400" />
    </Link>
  );
}
