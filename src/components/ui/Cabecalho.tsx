import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { ESTILO_COR, type CorTurma } from '@/lib/ui/cores';

type Props = {
  voltar?: { href: string; rotulo: string };
  titulo: string;
  subtitulo?: ReactNode;
  acoes?: ReactNode;
  cor?: CorTurma;
  children?: ReactNode;
};

export function Cabecalho({ voltar, titulo, subtitulo, acoes, cor, children }: Props) {
  const fundo = cor ? `${ESTILO_COR[cor].forte} text-white` : 'border-b border-slate-200 bg-white text-slate-900';
  return (
    <header className={`-mx-4 -mt-4 mb-4 px-4 pt-2 ${children ? '' : 'pb-4'} ${fundo}`}>
      <div className="flex h-11 items-center justify-between gap-2">
        {voltar ? (
          <Link href={voltar.href} className={`flex min-w-0 items-center gap-1 text-sm ${cor ? 'text-white/90' : 'text-blue-600'}`}>
            <ChevronLeft aria-hidden className="h-4 w-4 shrink-0" />
            <span className="truncate">{voltar.rotulo}</span>
          </Link>
        ) : (
          <span />
        )}
        {acoes}
      </div>
      <h1 className="break-words text-2xl font-bold leading-tight">{titulo}</h1>
      {subtitulo && <div className={`mt-1 text-sm ${cor ? 'text-white/85' : 'text-slate-500'}`}>{subtitulo}</div>}
      {children}
    </header>
  );
}
