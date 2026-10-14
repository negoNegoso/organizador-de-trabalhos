'use client';

import { CloudUpload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Confirmar } from '@/components/ui/Confirmar';
import type { ItemFila } from '@/lib/fila/fila';
import { useFila } from '@/lib/fila/useFila';

export function StatusFila() {
  const router = useRouter();
  const { itens, processar, descartar } = useFila();
  const anterior = useRef(0);
  const [aberta, setAberta] = useState(false);
  const [descartando, setDescartando] = useState<ItemFila | null>(null);

  // Quando algo termina de subir, recarrega os dados da página atual.
  useEffect(() => {
    if (itens.length < anterior.current) router.refresh();
    anterior.current = itens.length;
  }, [itens.length, router]);

  if (!itens.length) return null;

  return (
    <div role="status" className="mx-auto max-w-2xl px-3 pb-2">
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 text-sm shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <button type="button" aria-expanded={aberta} onClick={() => setAberta((a) => !a)} className="flex min-h-11 items-center gap-2 font-medium">
            <CloudUpload aria-hidden className="h-4 w-4" />
            {itens.length} envio(s) pendente(s)
          </button>
          <button type="button" onClick={() => void processar()} className="min-h-11 text-blue-600">Tentar de novo</button>
        </div>
        {aberta && (
          <ul className="space-y-1 pb-2">
            {itens.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate">
                  {i.titulo}
                  {i.ultimoErro && <span className="text-red-600"> — {i.ultimoErro}</span>}
                </span>
                <button type="button" onClick={() => setDescartando(i)} className="min-h-11 text-red-600">Descartar</button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {descartando && (
        <Confirmar
          titulo="Descartar envio?"
          mensagem={`“${descartando.titulo}” ainda não foi enviado e será perdido.`}
          textoConfirmar="Descartar"
          onCancelar={() => setDescartando(null)}
          onConfirmar={async () => {
            await descartar(descartando.id);
            setDescartando(null);
          }}
        />
      )}
    </div>
  );
}
