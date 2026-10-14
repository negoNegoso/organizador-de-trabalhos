import Link from 'next/link';
import { AcoesAluno } from '@/components/aluno/AcoesAluno';
import { ListaArquivos } from '@/components/aluno/ListaArquivos';
import { obterAluno } from '@/lib/dados/alunos';
import { listarArquivosDoAluno } from '@/lib/dados/arquivos';
import { listarAtividades } from '@/lib/dados/atividades';
import { agruparPorAtividade } from '@/lib/dominio/agrupar';
import { clienteServidor } from '@/lib/supabase/servidor';

export default async function PaginaAluno({ params }: { params: Promise<{ alunoId: string }> }) {
  const { alunoId } = await params;
  const sb = await clienteServidor();
  const aluno = await obterAluno(sb, alunoId);
  const [arquivos, atividades] = await Promise.all([
    listarArquivosDoAluno(sb, alunoId),
    listarAtividades(sb, aluno.turma_id),
  ]);

  return (
    <div className="space-y-4">
      <nav className="text-sm">
        <Link href={`/turmas/${aluno.turma_id}`}>← {aluno.turmas.nome} · {aluno.turmas.anos_letivos.ano}</Link>
      </nav>
      <h1 className="text-xl font-semibold">{aluno.nome}</h1>
      <AcoesAluno aluno={{ id: aluno.id, turma_id: aluno.turma_id, nome: aluno.nome }} />
      <div className="flex gap-2">
        <Link href={`/alunos/${alunoId}/escanear`} className="flex-1 rounded bg-blue-700 py-3 text-center text-white">Escanear</Link>
        <Link href={`/alunos/${alunoId}/enviar`} className="flex-1 rounded border bg-white py-3 text-center">Enviar arquivo</Link>
      </div>
      <ListaArquivos grupos={agruparPorAtividade(arquivos, atividades)} alunoId={alunoId} />
    </div>
  );
}
