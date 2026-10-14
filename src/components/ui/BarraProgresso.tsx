export function BarraProgresso({ valor, total }: { valor: number; total: number }) {
  const pct = total ? Math.round((valor / total) * 100) : 0;
  const cor = pct >= 75 ? 'bg-green-500' : pct >= 40 ? 'bg-amber-500' : 'bg-orange-500';
  return (
    <div>
      <div className="text-right text-xs text-slate-500">{valor}/{total} entregues</div>
      <div role="progressbar" aria-label="Entregas" aria-valuetext={`${valor} de ${total} entregues`} aria-valuenow={valor} aria-valuemin={0} aria-valuemax={total} className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200">
        <div className={`h-2 rounded-full ${cor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
