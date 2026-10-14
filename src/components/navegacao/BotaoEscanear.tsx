'use client';

import { Camera } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { acaoDoBotao } from '@/lib/ui/navegacao';
import { MenuEscanear } from './MenuEscanear';

export function BotaoEscanear() {
  const pathname = usePathname();
  const router = useRouter();
  const [menu, setMenu] = useState(false);

  function tocar() {
    const acao = acaoDoBotao(pathname);
    if (acao.tipo === 'ir') router.push(acao.href);
    else if (acao.tipo === 'lote-turma') router.push('/lote');
    else setMenu(true);
  }

  return (
    <>
      <button
        type="button"
        aria-label="Escanear"
        onClick={tocar}
        className="-mt-5 mb-1 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-600/40"
      >
        <Camera aria-hidden className="h-6 w-6" />
      </button>
      {menu && <MenuEscanear onFechar={() => setMenu(false)} />}
    </>
  );
}
