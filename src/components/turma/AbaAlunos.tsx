import { ItemLista } from '@/components/ui/ItemLista';
import type { AlunoComContagem } from '@/lib/tipos';
import { AdicionarAlunos } from './AdicionarAlunos';

export function AbaAlunos({ turmaId, alunos }: { turmaId: string; alunos: AlunoComContagem[] }) {
  return (
    <div className="space-y-2">
      <AdicionarAlunos turmaId={turmaId} existentes={alunos.map((a) => a.nome)} />
      {alunos.length === 0 ? (
        <p className="text-sm text-slate-500">Nenhum aluno ainda.</p>
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {alunos.map((a) => (
            <li key={a.id}>
              <ItemLista href={`/alunos/${a.id}`} titulo={a.nome} detalhe={`${a.total_arquivos} arq.`} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
