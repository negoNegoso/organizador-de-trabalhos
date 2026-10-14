import { Scanner } from '@/components/scanner/Scanner';
import { obterAluno } from '@/lib/dados/alunos';
import { listarAtividades } from '@/lib/dados/atividades';
import { clienteServidor } from '@/lib/supabase/servidor';

export default async function PaginaEscanear({ params }: { params: Promise<{ alunoId: string }> }) {
  const { alunoId } = await params;
  const sb = await clienteServidor();
  const aluno = await obterAluno(sb, alunoId);
  const atividades = await listarAtividades(sb, aluno.turma_id);
  return <Scanner modo="avulso" aluno={{ id: aluno.id, turma_id: aluno.turma_id, nome: aluno.nome }} atividades={atividades} />;
}
