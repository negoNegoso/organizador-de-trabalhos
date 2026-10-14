import { formatarBytes, LIMITE_STORAGE, usoAlto } from '@/lib/dominio/formato';

export function UsoStorage({ bytes }: { bytes: number }) {
  const pct = Math.min(100, Math.round((bytes / LIMITE_STORAGE) * 100));
  const alto = usoAlto(bytes);
  return (
    <section className="space-y-1 text-sm">
      <p>{formatarBytes(bytes)} de 1 GB usados</p>
      <div className="h-2 rounded-full bg-slate-200">
        <div className={`h-2 rounded-full ${alto ? 'bg-red-500' : 'bg-blue-600'}`} style={{ width: `${pct}%` }} />
      </div>
      {alto && (
        <p role="alert" className="text-red-600">
          Armazenamento acima de 80%. Apague arquivos antigos ou aumente o plano do Supabase.
        </p>
      )}
    </section>
  );
}
