'use client';

import { useRouter } from 'next/navigation';
import { BotaoApagar } from '@/components/ui/BotaoApagar';
import { Renomear } from '@/components/ui/Renomear';
import { renomearTurma } from '@/lib/dados/turmas';
import { clienteNavegador } from '@/lib/supabase/navegador';
import type { Turma } from '@/lib/tipos';

export function AcoesTurma({ turma }: { turma: Turma }) {
  const router = useRouter();
  return (
    <div className="flex flex-wrap gap-4">
      <Renomear
        atual={turma.nome}
        rotulo="Renomear turma"
        onSalvar={async (nome) => {
          await renomearTurma(clienteNavegador(), turma.id, nome);
          router.refresh();
        }}
      />
      <BotaoApagar escopo={{ tipo: 'turma', id: turma.id }} rotulo="Apagar turma" descricao={`a turma ${turma.nome}`} depois={`/anos/${turma.ano_letivo_id}`} />
    </div>
  );
}
