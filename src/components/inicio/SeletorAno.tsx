'use client';

import { Check, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { MenuInferior } from '@/components/ui/MenuInferior';
import type { AnoLetivo } from '@/lib/tipos';
import { salvarAnoEscolhido } from '@/lib/ui/cookieAno';

export function SeletorAno({ anos, atual }: { anos: AnoLetivo[]; atual: AnoLetivo }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);

  function escolher(id: string) {
    salvarAnoEscolhido(id);
    setAberto(false);
    router.refresh();
  }

  return (
    <>
      <button type="button" onClick={() => setAberto(true)} className="inline-flex h-11 items-center gap-1 font-medium text-blue-600">
        Ano letivo {atual.ano}
        <ChevronDown aria-hidden className="h-4 w-4" />
      </button>
      <MenuInferior aberto={aberto} titulo="Ano letivo" onFechar={() => setAberto(false)}>
        <ul role="radiogroup" aria-label="Ano letivo" className="-mx-2">
          {anos.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                role="radio"
                aria-checked={a.id === atual.id}
                onClick={() => escolher(a.id)}
                className="flex h-12 w-full items-center justify-between rounded-xl px-2 hover:bg-slate-50"
              >
                <span>
                  {a.ano}
                  {a.arquivado && <span className="ml-2 text-sm text-slate-500">arquivado</span>}
                </span>
                {a.id === atual.id && <Check aria-hidden className="h-5 w-5 text-blue-600" />}
              </button>
            </li>
          ))}
        </ul>
      </MenuInferior>
    </>
  );
}
