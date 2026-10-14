'use client';

import { useRouter } from 'next/navigation';
import { BotaoApagar } from '@/components/ui/BotaoApagar';
import { Renomear } from '@/components/ui/Renomear';
import { renomearAluno } from '@/lib/dados/alunos';
import { clienteNavegador } from '@/lib/supabase/navegador';
import type { Aluno } from '@/lib/tipos';

export function AcoesAluno({ aluno }: { aluno: Aluno }) {
  const router = useRouter();
  return (
    <div className="flex flex-wrap gap-4">
      <Renomear
        atual={aluno.nome}
        rotulo="Renomear aluno"
        onSalvar={async (nome) => {
          await renomearAluno(clienteNavegador(), aluno.id, nome);
          router.refresh();
        }}
      />
      <BotaoApagar escopo={{ tipo: 'aluno', id: aluno.id }} rotulo="Apagar aluno" descricao={aluno.nome} depois={`/turmas/${aluno.turma_id}`} />
    </div>
  );
}
