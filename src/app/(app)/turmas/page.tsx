import { cookies } from 'next/headers';
import Link from 'next/link';
import { NovaTurma } from '@/components/turma/NovaTurma';
import { Cabecalho } from '@/components/ui/Cabecalho';
import { ItemLista } from '@/components/ui/ItemLista';
import { plural } from '@/lib/dominio/formato';
import { listarAnos } from '@/lib/dados/anos';
import { listarTurmasPorAno } from '@/lib/dados/turmas';
import { clienteServidor } from '@/lib/supabase/servidor';
import { COOKIE_ANO, escolherAno } from '@/lib/ui/ano';

export default async function PaginaTurmas() {
  const sb = await clienteServidor();
  const cookieAno = (await cookies()).get(COOKIE_ANO)?.value;
  const [anos, turmas] = await Promise.all([listarAnos(sb), listarTurmasPorAno(sb)]);
  const atual = escolherAno(anos, cookieAno);
  const ordenados = [...anos].sort((a, b) => Number(a.arquivado) - Number(b.arquivado) || b.ano - a.ano);

  return (
    <div className="space-y-4">
      <Cabecalho
        titulo="Turmas"
        acoes={atual ? <NovaTurma anoId={atual.id} coresUsadas={turmas.filter((t) => t.ano.id === atual.id).map((t) => t.cor)} /> : undefined}
      />
      {!anos.length && (
        <p className="text-sm text-slate-600">
          Crie um ano letivo em <Link href="/mais" className="text-blue-600">Mais</Link>.
        </p>
      )}
      {ordenados.map((a) => {
        const doAno = turmas.filter((t) => t.ano.id === a.id);
        return (
          <details key={a.id} open={a.id === atual?.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <summary className="flex min-h-12 cursor-pointer items-center justify-between px-3 font-semibold">
              <span>
                {a.ano}
                {a.arquivado && <span className="ml-2 text-sm font-normal text-slate-500">arquivado</span>}
              </span>
              <span className="text-sm font-normal text-slate-500">{plural(doAno.length, 'turma', 'turmas')}</span>
            </summary>
            {doAno.length ? (
              <ul className="divide-y divide-slate-100 border-t border-slate-100">
                {doAno.map((t) => (
                  <li key={t.id}>
                    <ItemLista href={`/turmas/${t.id}`} titulo={t.nome} detalhe={plural(t.total_alunos, 'aluno', 'alunos')} ponto={t.cor} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="border-t border-slate-100 px-3 py-3 text-sm text-slate-500">Nenhuma turma ainda.</p>
            )}
            <Link href={`/anos/${a.id}`} className="block border-t border-slate-100 px-3 py-3 text-sm text-blue-600">Ver ano {a.ano}</Link>
          </details>
        );
      })}
    </div>
  );
}
