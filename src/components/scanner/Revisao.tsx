'use client';

import { useEffect, useState } from 'react';
import { imagemParaJpeg, processarPagina } from '@/lib/imagem/navegador';
import type { Filtro, Pagina, Rotacao } from '@/lib/imagem/tipos';
import { EditorCantos } from './EditorCantos';

const ERRO = 'erro';

function chave(p: Pagina, filtro: Filtro) {
  return `${p.id}|${p.cantos.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(';')}|${p.rotacao}|${filtro}`;
}

/** Gera prévias pequenas (400 px) uma de cada vez e guarda por chave. */
function usePrevias(paginas: Pagina[], filtro: Filtro): Record<string, string> {
  const [cache] = useState(() => new Map<string, string>());
  const [, forcar] = useState(0);

  useEffect(() => {
    let vivo = true;
    void (async () => {
      for (const p of paginas) {
        const k = chave(p, filtro);
        if (cache.has(k)) continue;
        try {
          const bytes = await imagemParaJpeg(await processarPagina(p, filtro, 400), 0.8);
          cache.set(k, URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'image/jpeg' })));
        } catch {
          cache.set(k, ERRO);
        }
        if (!vivo) return;
        forcar((n) => n + 1);
      }
    })();
    return () => {
      vivo = false;
    };
  }, [paginas, filtro, cache]);

  useEffect(() => {
    const mapa = cache;
    return () => mapa.forEach((u) => u !== ERRO && URL.revokeObjectURL(u));
  }, [cache]);

  return Object.fromEntries(paginas.map((p) => [p.id, cache.get(chave(p, filtro)) ?? '']));
}

type Props = {
  paginas: Pagina[];
  filtro: Filtro;
  onFiltro: (f: Filtro) => void;
  onAlterar: (paginas: Pagina[]) => void;
  onMaisPaginas: () => void;
  onContinuar: () => void;
};

export function Revisao({ paginas, filtro, onFiltro, onAlterar, onMaisPaginas, onContinuar }: Props) {
  const [editando, setEditando] = useState<Pagina | null>(null);
  const previas = usePrevias(paginas, filtro);

  const atualizar = (id: string, mudanca: Partial<Pagina>) =>
    onAlterar(paginas.map((p) => (p.id === id ? { ...p, ...mudanca } : p)));
  const trocar = (i: number, j: number) => {
    if (j < 0 || j >= paginas.length) return;
    const nova = [...paginas];
    [nova[i], nova[j]] = [nova[j], nova[i]];
    onAlterar(nova);
  };

  return (
    <div className="flex h-full flex-col bg-gray-900">
      <fieldset className="flex gap-4 p-3 text-sm">
        <legend className="sr-only">Filtro</legend>
        {(['documento', 'cor'] as const).map((f) => (
          <label key={f} className="flex items-center gap-1">
            <input type="radio" name="filtro" checked={filtro === f} onChange={() => onFiltro(f)} />
            {f === 'documento' ? 'Documento' : 'Cor'}
          </label>
        ))}
      </fieldset>
      <ol className="grid min-h-0 flex-1 grid-cols-2 content-start gap-3 overflow-y-auto p-3">
        {paginas.map((p, i) => (
          <li key={p.id} className="space-y-1 rounded bg-gray-800 p-2">
            {previas[p.id] === ERRO ? (
              <p className="text-xs text-red-300">Cantos inválidos — ajuste</p>
            ) : previas[p.id] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previas[p.id]} alt={`Página ${i + 1}`} className="w-full rounded bg-white" />
            ) : (
              <div className="aspect-[3/4] animate-pulse rounded bg-gray-700" />
            )}
            {!p.detectado && <p className="text-xs text-amber-300">Cantos não detectados — confira</p>}
            <div className="flex flex-wrap gap-2 text-xs">
              <button onClick={() => setEditando(p)}>Ajustar cantos</button>
              <button onClick={() => atualizar(p.id, { rotacao: ((p.rotacao + 90) % 360) as Rotacao })}>Girar</button>
              <button aria-label={`Mover página ${i + 1} para trás`} onClick={() => trocar(i, i - 1)}>◀</button>
              <button aria-label={`Mover página ${i + 1} para frente`} onClick={() => trocar(i, i + 1)}>▶</button>
              <button onClick={() => onAlterar(paginas.filter((q) => q.id !== p.id))} className="text-red-300">Apagar</button>
            </div>
          </li>
        ))}
      </ol>
      <div className="flex gap-2 p-3">
        <button onClick={onMaisPaginas} className="flex-1 rounded border py-3">Adicionar página</button>
        <button onClick={onContinuar} disabled={!paginas.length} className="flex-1 rounded bg-blue-600 py-3 disabled:opacity-50">
          Continuar ({paginas.length})
        </button>
      </div>
      {editando && (
        <EditorCantos
          pagina={editando}
          onCancelar={() => setEditando(null)}
          onSalvar={(cantos) => {
            atualizar(editando.id, { cantos, detectado: true });
            setEditando(null);
          }}
        />
      )}
    </div>
  );
}
