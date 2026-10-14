import Link from 'next/link';
import type { AlunoComContagem } from '@/lib/tipos';
import { AdicionarAlunos } from './AdicionarAlunos';

export function AbaAlunos({ turmaId, alunos }: { turmaId: string; alunos: AlunoComContagem[] }) {
  return (
    <div className="space-y-4">
      {alunos.length === 0 ? (
        <p className="text-sm text-gray-600">Nenhum aluno ainda.</p>
      ) : (
        <ul className="divide-y rounded border bg-white">
          {alunos.map((a) => (
            <li key={a.id}>
              <Link href={`/alunos/${a.id}`} className="flex justify-between p-3">
                <span>{a.nome}</span>
                <span className="text-sm text-gray-500">{a.total_arquivos} arquivo(s)</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <AdicionarAlunos turmaId={turmaId} existentes={alunos.map((a) => a.nome)} />
    </div>
  );
}
