'use client';

import Link from 'next/link';
import { useEffect, useId, useState } from 'react';
import { buscarAlunos } from '@/lib/dados/alunos';
import { normalizar } from '@/lib/dominio/busca';
import { clienteNavegador } from '@/lib/supabase/navegador';
import type { ResultadoBusca } from '@/lib/tipos';
import { ESTILO_COR } from '@/lib/ui/cores';

type Props = { rotulo?: string; onEscolher?: (r: ResultadoBusca) => void; excluirId?: string; autoFocus?: boolean };

const rotuloDe = (r: ResultadoBusca) => `${r.nome} — ${r.turma.nome} (${r.ano})`;

export function BuscarAluno({ rotulo = 'Buscar aluno', onEscolher, excluirId, autoFocus }: Props) {
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
      <input id={id} type="search" value={termo} onChange={(e) => setTermo(e.target.value)} autoFocus={autoFocus} className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3" />
      {lista.length > 0 && (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {lista.map((r) => (
            <li key={r.id}>
              {onEscolher ? (
                <button type="button" onClick={() => onEscolher(r)} className="w-full p-3 text-left"><span aria-hidden className={`mr-2 inline-block h-2.5 w-2.5 rounded-full ${ESTILO_COR[r.turma.cor].ponto}`} />{rotuloDe(r)}</button>
              ) : (
                <Link href={`/alunos/${r.id}`} className="block p-3"><span aria-hidden className={`mr-2 inline-block h-2.5 w-2.5 rounded-full ${ESTILO_COR[r.turma.cor].ponto}`} />{rotuloDe(r)}</Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
