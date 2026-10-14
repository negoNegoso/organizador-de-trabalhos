'use client';

import { House, Menu, Search, Users, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { abaAtiva, barraVisivel, type Aba } from '@/lib/ui/navegacao';
import { BotaoEscanear } from './BotaoEscanear';

type Item = { aba: Aba; href: string; rotulo: string; Icone: LucideIcon };

const ESQUERDA: Item[] = [
  { aba: 'inicio', href: '/', rotulo: 'Início', Icone: House },
  { aba: 'turmas', href: '/turmas', rotulo: 'Turmas', Icone: Users },
];
const DIREITA: Item[] = [
  { aba: 'buscar', href: '/buscar', rotulo: 'Buscar', Icone: Search },
  { aba: 'mais', href: '/mais', rotulo: 'Mais', Icone: Menu },
];

export function BarraAbas() {
  const pathname = usePathname();
  if (!barraVisivel(pathname)) return null;
  const ativa = abaAtiva(pathname);

  const link = ({ aba, href, rotulo, Icone }: Item) => (
    <Link
      key={aba}
      href={href}
      aria-current={ativa === aba ? 'page' : undefined}
      className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] ${ativa === aba ? 'font-semibold text-blue-600' : 'text-slate-500'}`}
    >
      <Icone aria-hidden className="h-6 w-6" />
      {rotulo}
    </Link>
  );

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)]"
    >
      <div className="mx-auto flex max-w-2xl items-end px-2">
        {ESQUERDA.map(link)}
        <div className="flex flex-1 justify-center">
          <BotaoEscanear />
        </div>
        {DIREITA.map(link)}
      </div>
    </nav>
  );
}
