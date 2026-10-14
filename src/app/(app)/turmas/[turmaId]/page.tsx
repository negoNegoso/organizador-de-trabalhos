import Link from 'next/link';
import { AbaAlunos } from '@/components/turma/AbaAlunos';
import { AbaAtividades } from '@/components/turma/AbaAtividades';
import { AcoesTurma } from '@/components/turma/AcoesTurma';
import { listarAlunos } from '@/lib/dados/alunos';
import { entregasDaTurma, listarAtividades } from '@/lib/dados/atividades';
import { obterTurma } from '@/lib/dados/turmas';
import { clienteServidor } from '@/lib/supabase/servidor';

type Props = { params: Promise<{ turmaId: string }>; searchParams: Promise<{ aba?: string }> };

export default async function PaginaTurma({ params, searchParams }: Props) {
  const { turmaId } = await params;
  const { aba = 'alunos' } = await searchParams;
  const sb = await clienteServidor();
  const turma = await obterTurma(sb, turmaId);
  const [alunos, atividades, entregas] = await Promise.all([
    listarAlunos(sb, turmaId),
    listarAtividades(sb, turmaId),
    entregasDaTurma(sb, turmaId),
  ]);
  const classeAba = (ativa: boolean) => `pb-2 ${ativa ? 'border-b-2 border-blue-700 font-medium' : 'text-gray-600'}`;

  return (
    <div className="space-y-4">
      <nav className="text-sm"><Link href={`/anos/${turma.ano_letivo_id}`}>← {turma.anos_letivos.ano}</Link></nav>
      <h1 className="text-xl font-semibold">{turma.nome}</h1>
      <AcoesTurma turma={turma} />
      <div role="tablist" className="flex gap-6 border-b">
        <Link role="tab" aria-selected={aba !== 'atividades'} href="?aba=alunos" className={classeAba(aba !== 'atividades')}>Alunos</Link>
        <Link role="tab" aria-selected={aba === 'atividades'} href="?aba=atividades" className={classeAba(aba === 'atividades')}>Atividades</Link>
      </div>
      {aba === 'atividades' ? (
        <AbaAtividades turmaId={turmaId} atividades={atividades} alunos={alunos} entregas={entregas} />
      ) : (
        <AbaAlunos turmaId={turmaId} alunos={alunos} />
      )}
    </div>
  );
}
