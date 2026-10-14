'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Confirmar } from '@/components/ui/Confirmar';
import type { ItemFila } from '@/lib/fila/fila';
import { useFila } from '@/lib/fila/useFila';

export function StatusFila() {
  const router = useRouter();
  const { itens, processar, descartar } = useFila();
  const anterior = useRef(0);
  const [descartando, setDescartando] = useState<ItemFila | null>(null);

  // Quando algo termina de subir, recarrega os dados da página atual.
  useEffect(() => {
    if (itens.length < anterior.current) router.refresh();
    anterior.current = itens.length;
  }, [itens.length, router]);

  if (!itens.length) return null;

  return (
    <div role="status" className="border-b bg-amber-50 px-4 py-2 text-sm">
      <div className="flex items-center justify-between">
        <span>{itens.length} envio(s) pendente(s)</span>
        <button onClick={() => void processar()} className="text-blue-700">Tentar de novo</button>
      </div>
      <ul className="mt-1 space-y-1">
        {itens.map((i) => (
          <li key={i.id} className="flex justify-between gap-2">
            <span className="min-w-0 truncate">
              {i.titulo}
              {i.ultimoErro && <span className="text-red-600"> — {i.ultimoErro}</span>}
            </span>
            <button onClick={() => setDescartando(i)} className="text-red-600">Descartar</button>
          </li>
        ))}
      </ul>
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
