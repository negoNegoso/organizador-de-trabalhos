import { AcoesAluno } from '@/components/aluno/AcoesAluno';
import { ListaArquivos } from '@/components/aluno/ListaArquivos';
import { Cabecalho } from '@/components/ui/Cabecalho';
import { EtiquetaTurma } from '@/components/ui/EtiquetaTurma';
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
    <div>
      <Cabecalho
        voltar={{ href: `/turmas/${aluno.turma_id}`, rotulo: aluno.turmas.nome }}
        titulo={aluno.nome}
        subtitulo={
          <span className="flex flex-wrap items-center gap-2">
            <EtiquetaTurma cor={aluno.turmas.cor} texto={`${aluno.turmas.nome} · ${aluno.turmas.anos_letivos.ano}`} />
            <span>{arquivos.length} trabalho(s)</span>
          </span>
        }
        acoes={<AcoesAluno aluno={{ id: aluno.id, turma_id: aluno.turma_id, nome: aluno.nome }} />}
      />
      <ListaArquivos grupos={agruparPorAtividade(arquivos, atividades)} alunoId={alunoId} />
    </div>
  );
}
