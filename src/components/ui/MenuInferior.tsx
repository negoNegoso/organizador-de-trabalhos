'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

type Props = { aberto: boolean; titulo: string; onFechar: () => void; children: ReactNode };

const LIMIAR_ARRASTO = 80;

export function MenuInferior({ aberto, titulo, onFechar, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const inicioY = useRef<number | null>(null);
  const [deslocamento, setDeslocamento] = useState(0);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (aberto && !d.open) d.showModal();
    if (!aberto && d.open) d.close();
  }, [aberto]);

  return (
    <dialog
      ref={ref}
      aria-label={titulo}
      onCancel={(e) => {
        e.preventDefault();
        onFechar();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onFechar();
      }}
      className="fixed inset-x-0 bottom-0 top-auto m-0 w-full max-w-none bg-transparent p-0 backdrop:bg-slate-900/45 sm:mx-auto sm:max-w-lg"
    >
      {aberto && (
        <div
          className="max-h-[85dvh] overflow-y-auto rounded-t-2xl bg-white px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] text-slate-900 shadow-xl"
          style={{ transform: `translateY(${deslocamento}px)` }}
        >
          <div
            aria-hidden
            className="flex h-6 cursor-grab touch-none items-center justify-center"
            onPointerDown={(e) => {
              inicioY.current = e.clientY;
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              if (inicioY.current !== null) setDeslocamento(Math.max(0, e.clientY - inicioY.current));
            }}
            onPointerUp={() => {
              const arrastou = deslocamento;
              inicioY.current = null;
              setDeslocamento(0);
              if (arrastou > LIMIAR_ARRASTO) onFechar();
            }}
          >
            <span className="h-1 w-10 rounded-full bg-slate-300" />
          </div>
          <h2 className="mb-3 text-lg font-semibold">{titulo}</h2>
          {children}
        </div>
      )}
    </dialog>
  );
}
