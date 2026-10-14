'use client';

import Link from 'next/link';
import { useEffect, useId, useState } from 'react';
import { buscarAlunos } from '@/lib/dados/alunos';
import { normalizar } from '@/lib/dominio/busca';
import { clienteNavegador } from '@/lib/supabase/navegador';
import type { ResultadoBusca } from '@/lib/tipos';

type Props = { rotulo?: string; onEscolher?: (r: ResultadoBusca) => void; excluirId?: string };

const rotuloDe = (r: ResultadoBusca) => `${r.nome} — ${r.turma.nome} (${r.ano})`;

export function BuscarAluno({ rotulo = 'Buscar aluno', onEscolher, excluirId }: Props) {
  const id = useId();
  const [termo, setTermo] = useState('');
  const [resultados, setResultados] = useState<ResultadoBusca[]>([]);
  const ativo = normalizar(termo).length >= 2;

  useEffect(() => {
    if (!ativo) return;
    let vivo = true;
    const t = setTimeout(async () => {
      try {
        const r = await buscarAlunos(clienteNavegador(), termo);
        if (vivo) setResultados(r.filter((x) => x.id !== excluirId));
      } catch {
        if (vivo) setResultados([]);
      }
    }, 250);
    return () => {
      vivo = false;
      clearTimeout(t);
    };
  }, [termo, ativo, excluirId]);

  const lista = ativo ? resultados : [];

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm">{rotulo}</label>
      <input id={id} type="search" value={termo} onChange={(e) => setTermo(e.target.value)} className="w-full rounded border px-3 py-2" />
      {lista.length > 0 && (
        <ul className="divide-y rounded border bg-white">
          {lista.map((r) => (
            <li key={r.id}>
              {onEscolher ? (
                <button type="button" onClick={() => onEscolher(r)} className="w-full p-3 text-left">{rotuloDe(r)}</button>
              ) : (
                <Link href={`/alunos/${r.id}`} className="block p-3">{rotuloDe(r)}</Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
