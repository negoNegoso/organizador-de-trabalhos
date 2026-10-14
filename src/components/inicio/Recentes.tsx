import Link from 'next/link';
import { EtiquetaTurma } from '@/components/ui/EtiquetaTurma';
import type { Recente } from '@/lib/tipos';

export function Recentes({ itens }: { itens: Recente[] }) {
  return (
    <section className="space-y-2">
      <h2 className="font-semibold">Recentes</h2>
      <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {itens.map((r) => (
          <li key={r.id}>
            <Link href={`/alunos/${r.aluno.id}`} className="flex min-h-14 items-center gap-3 px-3 py-2">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{r.titulo}</span>
                <span className="flex min-w-0 items-center gap-2 text-sm text-slate-500">
                  <span className="truncate">{r.aluno.nome}</span>
                  <EtiquetaTurma cor={r.turma.cor} texto={r.turma.nome} />
                </span>
              </span>
              <span className="shrink-0 text-xs text-slate-500">{new Date(r.criado_em).toLocaleDateString('pt-BR')}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
