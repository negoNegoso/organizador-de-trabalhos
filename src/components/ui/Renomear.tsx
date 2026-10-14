'use client';

import { useState } from 'react';
import { FormNome } from './FormNome';

type Props = { atual: string; rotulo?: string; onSalvar: (novo: string) => Promise<void> };

export function Renomear({ atual, rotulo = 'Renomear', onSalvar }: Props) {
  const [editando, setEditando] = useState(false);
  if (!editando) {
    return <button onClick={() => setEditando(true)} className="text-sm text-blue-700">{rotulo}</button>;
  }
  return (
    <div className="w-full">
      <FormNome
        rotulo="Novo nome"
        textoBotao="Salvar"
        inicial={atual}
        onSalvar={async (novo) => {
          await onSalvar(novo);
          setEditando(false);
        }}
      />
      <button onClick={() => setEditando(false)} className="mt-1 text-sm text-gray-600">Cancelar</button>
    </div>
  );
}
