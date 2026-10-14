import Link from 'next/link';
import { EscolherLote } from '@/components/lote/EscolherLote';
import { listarAnos } from '@/lib/dados/anos';
import { clienteServidor } from '@/lib/supabase/servidor';

export default async function PaginaLote() {
  const anos = (await listarAnos(await clienteServidor())).filter((a) => !a.arquivado);
  return (
    <div className="space-y-4">
      <nav className="text-sm"><Link href="/">← Início</Link></nav>
      <h1 className="text-xl font-semibold">Escanear lote</h1>
      <EscolherLote anos={anos} />
    </div>
  );
}
