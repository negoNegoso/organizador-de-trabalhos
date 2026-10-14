import { EnviarArquivos } from '@/components/envio/EnviarArquivos';
import { Cabecalho } from '@/components/ui/Cabecalho';
import { obterAluno } from '@/lib/dados/alunos';
import { listarAtividades } from '@/lib/dados/atividades';
import { clienteServidor } from '@/lib/supabase/servidor';

export default async function PaginaEnviar({ params }: { params: Promise<{ alunoId: string }> }) {
  const { alunoId } = await params;
  const sb = await clienteServidor();
  const aluno = await obterAluno(sb, alunoId);
  const atividades = await listarAtividades(sb, aluno.turma_id);
  return (
    <div className="space-y-4">
      <Cabecalho voltar={{ href: `/alunos/${alunoId}`, rotulo: aluno.nome }} titulo="Enviar arquivo" subtitulo={`Para ${aluno.nome}`} />
      <EnviarArquivos aluno={{ id: aluno.id, nome: aluno.nome }} atividades={atividades} voltarPara={`/alunos/${alunoId}`} />
    </div>
  );
}
