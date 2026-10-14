import { EscolherLote } from '@/components/lote/EscolherLote';
import { Cabecalho } from '@/components/ui/Cabecalho';
import { listarAnos } from '@/lib/dados/anos';
import { clienteServidor } from '@/lib/supabase/servidor';

export default async function PaginaLote() {
  const anos = (await listarAnos(await clienteServidor())).filter((a) => !a.arquivado);
  return (
    <div className="space-y-4">
      <Cabecalho voltar={{ href: '/', rotulo: 'Início' }} titulo="Escanear lote" />
      <EscolherLote anos={anos} />
    </div>
  );
}
