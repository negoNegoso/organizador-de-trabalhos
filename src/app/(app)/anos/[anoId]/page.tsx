import { AcoesAno } from '@/components/ano/AcoesAno';
import { NovaTurma } from '@/components/turma/NovaTurma';
import { Cabecalho } from '@/components/ui/Cabecalho';
import { CartaoTurma } from '@/components/ui/CartaoTurma';
import { obterAno } from '@/lib/dados/anos';
import { listarTurmasComContagem } from '@/lib/dados/turmas';
import { clienteServidor } from '@/lib/supabase/servidor';

export default async function PaginaAno({ params }: { params: Promise<{ anoId: string }> }) {
  const { anoId } = await params;
  const sb = await clienteServidor();
  const [ano, turmas] = await Promise.all([obterAno(sb, anoId), listarTurmasComContagem(sb, anoId)]);

  return (
    <div className="space-y-4">
      <Cabecalho
        voltar={{ href: '/mais', rotulo: 'Mais' }}
        titulo={String(ano.ano)}
        subtitulo={ano.arquivado ? 'Ano arquivado' : `${turmas.length} turmas`}
        acoes={<AcoesAno ano={ano} />}
      />
      <div className="flex justify-end">
        <NovaTurma anoId={anoId} coresUsadas={turmas.map((t) => t.cor)} />
      </div>
      {turmas.length ? (
        <div className="grid grid-cols-2 gap-3">
          {turmas.map((t) => <CartaoTurma key={t.id} turma={t} />)}
        </div>
      ) : (
        <p className="text-sm text-slate-500">Nenhuma turma ainda.</p>
      )}
    </div>
  );
}
