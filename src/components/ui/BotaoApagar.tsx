'use client';

import { useState } from 'react';
import type { Escopo } from '@/lib/tipos';
import { ConfirmarApagar } from './ConfirmarApagar';

type Props = { escopo: Escopo; rotulo: string; descricao: string; depois: string | 'refresh' };

export function BotaoApagar({ escopo, rotulo, descricao, depois }: Props) {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <button onClick={() => setAberto(true)} className="text-sm text-red-600">{rotulo}</button>
      {aberto && <ConfirmarApagar escopo={escopo} descricao={descricao} depois={depois} onFechar={() => setAberto(false)} />}
    </>
  );
}
