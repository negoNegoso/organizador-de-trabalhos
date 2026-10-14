import { BotaoSair } from '@/components/BotaoSair';
import { NovoAno } from '@/components/inicio/NovoAno';
import { UsoStorage } from '@/components/inicio/UsoStorage';
import { Cabecalho } from '@/components/ui/Cabecalho';
import { ItemLista } from '@/components/ui/ItemLista';
import { listarAnos } from '@/lib/dados/anos';
import { usoStorage } from '@/lib/dados/arquivos';
import { clienteServidor } from '@/lib/supabase/servidor';

export default async function PaginaMais() {
  const sb = await clienteServidor();
  const [anos, uso] = await Promise.all([listarAnos(sb), usoStorage(sb)]);
  return (
    <div className="space-y-6">
      <Cabecalho titulo="Mais" />
      <section className="space-y-3">
        <h2 className="font-semibold">Anos letivos</h2>
        {anos.length > 0 && (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
            {anos.map((a) => (
              <li key={a.id}>
                <ItemLista href={`/anos/${a.id}`} titulo={String(a.ano)} detalhe={a.arquivado ? 'arquivado' : undefined} />
              </li>
            ))}
          </ul>
        )}
        <NovoAno />
      </section>
      <section className="space-y-2 rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="font-semibold">Armazenamento</h2>
        <UsoStorage bytes={uso} />
      </section>
      <BotaoSair />
    </div>
  );
}
