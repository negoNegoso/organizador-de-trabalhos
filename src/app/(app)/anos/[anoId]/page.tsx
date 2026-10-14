import Link from 'next/link';
import { AcoesAno } from '@/components/ano/AcoesAno';
import { NovaTurma } from '@/components/turma/NovaTurma';
import { obterAno } from '@/lib/dados/anos';
import { listarTurmas } from '@/lib/dados/turmas';
import { clienteServidor } from '@/lib/supabase/servidor';

export default async function PaginaAno({ params }: { params: Promise<{ anoId: string }> }) {
  const { anoId } = await params;
  const sb = await clienteServidor();
  const [ano, turmas] = await Promise.all([obterAno(sb, anoId), listarTurmas(sb, anoId)]);

  return (
    <div className="space-y-4">
      <nav className="text-sm"><Link href="/">← Início</Link></nav>
      <h1 className="text-xl font-semibold">{ano.ano}</h1>
      {ano.arquivado && <p className="text-sm text-gray-600">Ano arquivado</p>}
      <AcoesAno ano={ano} />
      <ul className="grid grid-cols-2 gap-3">
        {turmas.map((t) => (
          <li key={t.id}>
            <Link href={`/turmas/${t.id}`} className="block rounded border bg-white p-4 font-medium">{t.nome}</Link>
          </li>
        ))}
      </ul>
      {turmas.length === 0 && <p className="text-sm text-gray-600">Nenhuma turma ainda.</p>}
      <NovaTurma anoId={anoId} coresUsadas={turmas.map((t) => t.cor)} />
    </div>
  );
}
