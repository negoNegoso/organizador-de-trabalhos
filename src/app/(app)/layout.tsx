import { EspacoFila } from '@/components/fila/EspacoFila';
import { StatusFila } from '@/components/fila/StatusFila';
import { BarraAbas } from '@/components/navegacao/BarraAbas';

export default function LayoutApp({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-slate-50 pb-[calc(6rem+env(safe-area-inset-bottom))]">
      <main className="mx-auto max-w-2xl px-4 pt-4">{children}
        <EspacoFila />
      </main>
      <div className="fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-20">
        <StatusFila />
      </div>
      <BarraAbas />
    </div>
  );
}
