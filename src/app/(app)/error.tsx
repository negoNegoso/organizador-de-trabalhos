'use client';

export default function Erro({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-semibold">Algo deu errado</h1>
      <p className="text-sm text-slate-600">Talvez o item tenha sido apagado ou a conexão caiu.</p>
      <button onClick={reset} className="rounded-xl border px-3 py-2">Tentar de novo</button>
    </div>
  );
}
