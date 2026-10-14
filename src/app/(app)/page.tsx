import { Search } from 'lucide-react';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { Recentes } from '@/components/inicio/Recentes';
import { SeletorAno } from '@/components/inicio/SeletorAno';
import { NovaTurma } from '@/components/turma/NovaTurma';
import { Cabecalho } from '@/components/ui/Cabecalho';
import { CartaoTurma } from '@/components/ui/CartaoTurma';
import { listarAnos } from '@/lib/dados/anos';
import { listarRecentes } from '@/lib/dados/arquivos';
import { listarTurmasComContagem } from '@/lib/dados/turmas';
import { clienteServidor } from '@/lib/supabase/servidor';
import { COOKIE_ANO, escolherAno } from '@/lib/ui/ano';

export default async function Inicio() {
  const sb = await clienteServidor();
  const cookieAno = (await cookies()).get(COOKIE_ANO)?.value;
  const [anos, recentes] = await Promise.all([listarAnos(sb), listarRecentes(sb)]);
  const ano = escolherAno(anos, cookieAno);
  const turmas = ano ? await listarTurmasComContagem(sb, ano.id) : [];

  return (
    <div className="space-y-6">
      <Cabecalho titulo="Início" subtitulo={ano ? <SeletorAno anos={anos} atual={ano} /> : undefined} />
      <Link href="/buscar" className="flex h-12 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-slate-400">
        <Search aria-hidden className="h-5 w-5" />
        Buscar aluno…
      </Link>

      {!ano ? (
        <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 text-center">
          <p className="text-slate-600">Nenhum ano letivo ainda.</p>
          <Link href="/mais" className="inline-flex h-12 items-center rounded-xl bg-blue-600 px-4 font-medium text-white">Criar ano letivo</Link>
        </section>
      ) : (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Turmas de {ano.ano}</h2>
            <NovaTurma anoId={ano.id} coresUsadas={turmas.map((t) => t.cor)} />
          </div>
          {turmas.length ? (
            <div className="grid grid-cols-2 gap-3">
              {turmas.map((t) => <CartaoTurma key={t.id} turma={t} />)}
            </div>
          ) : (
            <p className="text-sm text-slate-500">Nenhuma turma em {ano.ano}</p>
          )}
        </section>
      )}

      {recentes.length > 0 && <Recentes itens={recentes} />}
    </div>
  );
}
