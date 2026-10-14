import { Scanner } from '@/components/scanner/Scanner';
import { listarAlunos } from '@/lib/dados/alunos';
import { alunosComEntrega, obterAtividade } from '@/lib/dados/atividades';
import { clienteServidor } from '@/lib/supabase/servidor';

export default async function PaginaLoteScanner({ params }: { params: Promise<{ atividadeId: string }> }) {
  const { atividadeId } = await params;
  const sb = await clienteServidor();
  const atividade = await obterAtividade(sb, atividadeId);
  const [alunos, entregues] = await Promise.all([listarAlunos(sb, atividade.turma_id), alunosComEntrega(sb, atividadeId)]);
  return (
    <Scanner
      modo="lote"
      atividade={{ id: atividade.id, turma_id: atividade.turma_id, nome: atividade.nome, data: atividade.data }}
      alunos={alunos.map(({ id, turma_id, nome }) => ({ id, turma_id, nome }))}
      entreguesNoBanco={entregues}
    />
  );
}
