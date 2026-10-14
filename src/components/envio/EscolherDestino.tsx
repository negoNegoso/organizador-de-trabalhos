'use client';

import { useState, type FormEvent } from 'react';
import { tituloPadrao } from '@/lib/dominio/formato';
import { limparNome } from '@/lib/dominio/nomes';
import type { Atividade } from '@/lib/tipos';

type Props = {
  atividades: Atividade[];
  textoBotao: string;
  ocupado: boolean;
  onConfirmar: (d: { atividadeId: string | null; titulo: string }) => void;
};

export function EscolherDestino({ atividades, textoBotao, ocupado, onConfirmar }: Props) {
  const [atividadeId, setAtividadeId] = useState(atividades[0]?.id ?? '');
  const [titulo, setTitulo] = useState(() => tituloPadrao(new Date()));

  function confirmar(e: FormEvent) {
    e.preventDefault();
    const atividade = atividades.find((a) => a.id === atividadeId);
    onConfirmar(
      atividade
        ? { atividadeId: atividade.id, titulo: atividade.nome }
        : { atividadeId: null, titulo: limparNome(titulo) || tituloPadrao(new Date()) },
    );
  }

  return (
    <form onSubmit={confirmar} className="space-y-3">
      <label className="block text-sm">
        Atividade
        <select value={atividadeId} onChange={(e) => setAtividadeId(e.target.value)} className="mt-1 w-full rounded border bg-white px-3 py-2">
          {atividades.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
          <option value="">Sem atividade (título livre)</option>
        </select>
      </label>
      {!atividadeId && (
        <label className="block text-sm">
          Título
          <input value={titulo} onChange={(e) => setTitulo(e.target.value)} className="mt-1 w-full rounded border px-3 py-2" />
        </label>
      )}
      <button disabled={ocupado} className="w-full rounded bg-blue-700 py-3 text-white disabled:opacity-50">
        {ocupado ? 'Preparando…' : textoBotao}
      </button>
    </form>
  );
}
