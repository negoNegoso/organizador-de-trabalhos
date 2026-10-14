'use client';

import { MenuInferior } from './MenuInferior';

type Props = {
  titulo: string;
  mensagem: string;
  textoConfirmar: string;
  ocupado?: boolean;
  erro?: string | null;
  onConfirmar: () => void;
  onCancelar: () => void;
};

export function Confirmar({ titulo, mensagem, textoConfirmar, ocupado, erro, onConfirmar, onCancelar }: Props) {
  return (
    <MenuInferior aberto titulo={titulo} onFechar={onCancelar}>
      <p className="text-sm text-slate-600">{mensagem}</p>
      {erro && <p role="alert" className="mt-2 text-sm text-red-600">{erro}</p>}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button type="button" onClick={onCancelar} className="h-12 rounded-xl border border-slate-200 font-medium">
          Cancelar
        </button>
        <button
          type="button"
          onClick={onConfirmar}
          disabled={ocupado}
          className="h-12 rounded-xl bg-red-600 font-medium text-white disabled:opacity-50"
        >
          {textoConfirmar}
        </button>
      </div>
    </MenuInferior>
  );
}
