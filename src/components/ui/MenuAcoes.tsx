'use client';

import { MoreHorizontal, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { MenuInferior } from './MenuInferior';

export type AcaoMenu = { rotulo: string; icone: LucideIcon; perigoso?: boolean; aoEscolher: () => void };

type Props = { titulo: string; acoes: AcaoMenu[]; rotuloBotao?: string; claro?: boolean };

export function MenuAcoes({ titulo, acoes, rotuloBotao = 'Mais ações', claro }: Props) {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-label={rotuloBotao}
        onClick={() => setAberto(true)}
        className={`flex h-11 w-11 items-center justify-center rounded-full ${claro ? 'text-white hover:bg-white/15' : 'text-slate-600 hover:bg-slate-100'}`}
      >
        <MoreHorizontal aria-hidden className="h-6 w-6" />
      </button>
      <MenuInferior aberto={aberto} titulo={titulo} onFechar={() => setAberto(false)}>
        <ul className="-mx-2">
          {acoes.map(({ rotulo, icone: Icone, perigoso, aoEscolher }) => (
            <li key={rotulo}>
              <button
                type="button"
                onClick={() => {
                  setAberto(false);
                  aoEscolher();
                }}
                className={`flex h-12 w-full items-center gap-3 rounded-xl px-2 text-left hover:bg-slate-50 ${perigoso ? 'text-red-600' : ''}`}
              >
                <Icone aria-hidden className="h-5 w-5" />
                {rotulo}
              </button>
            </li>
          ))}
        </ul>
      </MenuInferior>
    </>
  );
}
