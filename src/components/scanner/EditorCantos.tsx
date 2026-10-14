'use client';

import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { cantosDaImagem } from '@/lib/imagem/cantos';
import type { Cantos, Pagina, Ponto } from '@/lib/imagem/tipos';

type Props = { pagina: Pagina; onSalvar: (c: Cantos) => void; onCancelar: () => void };

export function EditorCantos({ pagina, onSalvar, onCancelar }: Props) {
  const [cantos, setCantos] = useState<Cantos>(pagina.cantos);
  const [url, setUrl] = useState<string>();
  const svg = useRef<SVGSVGElement>(null);
  const arrastando = useRef<number | null>(null);

  useEffect(() => {
    // O URL do blob é um recurso externo criado/liberado com o efeito.
    const u = URL.createObjectURL(pagina.fonte);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [pagina.fonte]);

  function paraImagem(e: PointerEvent): Ponto {
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.current!.getScreenCTM()!.inverse());
    return {
      x: Math.min(Math.max(p.x, 0), pagina.largura),
      y: Math.min(Math.max(p.y, 0), pagina.altura),
    };
  }

  const raio = Math.max(pagina.largura, pagina.altura) * 0.03;
  const soltar = () => (arrastando.current = null);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-white">
      <svg
        ref={svg}
        viewBox={`0 0 ${pagina.largura} ${pagina.altura}`}
        preserveAspectRatio="xMidYMid meet"
        className="min-h-0 flex-1 touch-none"
        onPointerMove={(e) => {
          const i = arrastando.current;
          if (i === null) return;
          const p = paraImagem(e);
          setCantos((c) => c.map((q, j) => (j === i ? p : q)) as Cantos);
        }}
        onPointerUp={soltar}
        onPointerCancel={soltar}
      >
        {url && <image href={url} width={pagina.largura} height={pagina.altura} />}
        <polygon
          points={cantos.map((p) => `${p.x},${p.y}`).join(' ')}
          fill="rgba(34,197,94,0.2)"
          stroke="#22c55e"
          strokeWidth={raio / 4}
        />
        {cantos.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={raio}
            fill="rgba(255,255,255,0.8)"
            stroke="#22c55e"
            strokeWidth={raio / 5}
            onPointerDown={(e) => {
              arrastando.current = i;
              (e.target as Element).setPointerCapture(e.pointerId);
            }}
          />
        ))}
      </svg>
      <div className="flex gap-2 p-3">
        <button onClick={onCancelar} className="flex-1 rounded border py-3">Cancelar</button>
        <button onClick={() => setCantos(cantosDaImagem({ width: pagina.largura, height: pagina.altura }))} className="flex-1 rounded border py-3">
          Página inteira
        </button>
        <button onClick={() => onSalvar(cantos)} className="flex-1 rounded bg-blue-600 py-3">Aplicar</button>
      </div>
    </div>
  );
}
