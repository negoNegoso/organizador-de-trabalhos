import Link from 'next/link';
import { NovoAno } from '@/components/inicio/NovoAno';
import { UsoStorage } from '@/components/inicio/UsoStorage';
import { BuscarAluno } from '@/components/ui/BuscarAluno';
import { listarAnos } from '@/lib/dados/anos';
import { usoStorage } from '@/lib/dados/arquivos';
import { clienteServidor } from '@/lib/supabase/servidor';
import type { AnoLetivo } from '@/lib/tipos';

function ListaAnos({ anos }: { anos: AnoLetivo[] }) {
  return (
    <ul className="grid grid-cols-3 gap-2">
      {anos.map((a) => (
        <li key={a.id}>
          <Link href={`/anos/${a.id}`} className="block rounded border bg-white p-3 text-center font-medium">{a.ano}</Link>
        </li>
      ))}
    </ul>
  );
}

export default async function Inicio() {
  const sb = await clienteServidor();
  const [anos, uso] = await Promise.all([listarAnos(sb), usoStorage(sb)]);
  const ativos = anos.filter((a) => !a.arquivado);
  const arquivados = anos.filter((a) => a.arquivado);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Início</h1>
      <Link href="/lote" className="block rounded bg-blue-700 py-4 text-center text-lg text-white">Escanear lote</Link>
      <BuscarAluno />
      <section className="space-y-3">
        <h2 className="font-medium">Anos letivos</h2>
        <ListaAnos anos={ativos} />
        {arquivados.length > 0 && (
          <details>
            <summary className="cursor-pointer text-sm text-gray-600">Arquivados ({arquivados.length})</summary>
            <div className="mt-2"><ListaAnos anos={arquivados} /></div>
          </details>
        )}
        <NovoAno />
      </section>
      <UsoStorage bytes={uso} />
    </div>
  );
}
