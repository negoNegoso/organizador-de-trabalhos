'use client';

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
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirmar-titulo"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
    >
      <div className="w-full max-w-sm space-y-4 rounded-lg bg-white p-4 text-gray-900">
        <h2 id="confirmar-titulo" className="font-semibold">{titulo}</h2>
        <p className="text-sm text-gray-700">{mensagem}</p>
        {erro && <p role="alert" className="text-sm text-red-600">{erro}</p>}
        <div className="flex justify-end gap-2">
          <button onClick={onCancelar} className="rounded px-3 py-2">Cancelar</button>
          <button onClick={onConfirmar} disabled={ocupado} className="rounded bg-red-600 px-3 py-2 text-white disabled:opacity-50">
            {textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
}
