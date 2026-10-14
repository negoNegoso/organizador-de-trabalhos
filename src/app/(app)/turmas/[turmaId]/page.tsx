import Link from 'next/link';
import { AbaAlunos } from '@/components/turma/AbaAlunos';
import { AbaAtividades } from '@/components/turma/AbaAtividades';
import { AcoesTurma } from '@/components/turma/AcoesTurma';
import { Cabecalho } from '@/components/ui/Cabecalho';
import { listarAlunos } from '@/lib/dados/alunos';
import { entregasDaTurma, listarAtividades } from '@/lib/dados/atividades';
import { plural } from '@/lib/dominio/formato';
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
  const naAtividades = aba === 'atividades';
  const classeAba = (ativa: boolean) =>
    `border-b-[3px] pb-2 ${ativa ? 'border-white font-semibold' : 'border-transparent text-white/80'}`;

  return (
    <div>
      <Cabecalho
        cor={turma.cor}
        voltar={{ href: `/anos/${turma.ano_letivo_id}`, rotulo: String(turma.anos_letivos.ano) }}
        titulo={turma.nome}
        subtitulo={`${plural(alunos.length, 'aluno', 'alunos')} · ${plural(atividades.length, 'atividade', 'atividades')}`}
        acoes={<AcoesTurma turma={turma} />}
      >
        <div role="tablist" className="mt-3 flex gap-6 text-sm">
          <Link role="tab" aria-selected={!naAtividades} href="?aba=alunos" className={classeAba(!naAtividades)}>Alunos</Link>
          <Link role="tab" aria-selected={naAtividades} href="?aba=atividades" className={classeAba(naAtividades)}>Atividades</Link>
        </div>
      </Cabecalho>
      {naAtividades ? (
        <AbaAtividades turmaId={turmaId} atividades={atividades} alunos={alunos} entregas={entregas} />
      ) : (
        <AbaAlunos turmaId={turmaId} alunos={alunos} />
      )}
    </div>
  );
}
