import Link from 'next/link';
import { ESTILO_COR } from '@/lib/ui/cores';
import type { TurmaComContagem } from '@/lib/tipos';

export function CartaoTurma({ turma }: { turma: TurmaComContagem }) {
  return (
    <Link
      href={`/turmas/${turma.id}`}
      data-cor={turma.cor}
      className={`flex h-24 min-w-0 flex-col justify-between rounded-xl p-3 text-white shadow-sm ${ESTILO_COR[turma.cor].forte}`}
    >
      <span className="truncate text-lg font-semibold">{turma.nome}</span>
      <span className="text-xs text-white/90">{turma.total_alunos === 1 ? '1 aluno' : `${turma.total_alunos} alunos`}</span>
    </Link>
  );
}
