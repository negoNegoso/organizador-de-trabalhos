'use client';

import { useRouter } from 'next/navigation';
import { FormNome } from '@/components/ui/FormNome';
import { criarTurma } from '@/lib/dados/turmas';
import { clienteNavegador } from '@/lib/supabase/navegador';

export function NovaTurma({ anoId }: { anoId: string }) {
  const router = useRouter();
  return (
    <FormNome
      rotulo="Nome da turma"
      textoBotao="Criar turma"
      placeholder="ex.: 3º A"
      onSalvar={async (nome) => {
        await criarTurma(clienteNavegador(), anoId, nome);
        router.refresh();
      }}
    />
  );
}
