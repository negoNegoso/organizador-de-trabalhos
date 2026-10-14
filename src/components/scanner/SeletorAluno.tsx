'use client';

import { useState } from 'react';
import { normalizar } from '@/lib/dominio/busca';
import type { Aluno } from '@/lib/tipos';

type Props = { alunos: Aluno[]; entregues: Set<string>; ocupado: boolean; onEscolher: (a: Aluno) => void };

export function SeletorAluno({ alunos, entregues, ocupado, onEscolher }: Props) {
  const [filtro, setFiltro] = useState('');
  const [todos, setTodos] = useState(false);
  const visiveis = alunos.filter(
    (a) => (todos || !entregues.has(a.id)) && normalizar(a.nome).includes(normalizar(filtro)),
  );

  return (
    <div className="space-y-3">
      <h2 className="font-semibold">De quem é este trabalho?</h2>
      <label className="block text-sm">
        Filtrar
        <input type="search" value={filtro} onChange={(e) => setFiltro(e.target.value)} className="mt-1 w-full rounded border px-3 py-2" />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={todos} onChange={(e) => setTodos(e.target.checked)} /> Mostrar quem já entregou
      </label>
      {visiveis.length === 0 && (
        <p className="text-sm text-gray-600">{todos || filtro ? 'Nenhum aluno encontrado.' : 'Todos já entregaram.'}</p>
      )}
      <ul className="space-y-2">
        {visiveis.map((a) => (
          <li key={a.id}>
            <button disabled={ocupado} onClick={() => onEscolher(a)} className="w-full rounded border p-3 text-left disabled:opacity-50">
              {a.nome}
              {entregues.has(a.id) && <span className="ml-2 text-xs text-gray-500">(já entregou)</span>}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
