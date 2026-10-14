'use client';

import { FileUp, Pencil, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ConfirmarApagar } from '@/components/ui/ConfirmarApagar';
import { MenuAcoes } from '@/components/ui/MenuAcoes';
import { PainelNome } from '@/components/ui/PainelNome';
import { renomearAluno } from '@/lib/dados/alunos';
import { clienteNavegador } from '@/lib/supabase/navegador';
import type { Aluno } from '@/lib/tipos';

export function AcoesAluno({ aluno }: { aluno: Aluno }) {
  const router = useRouter();
  const [painel, setPainel] = useState<null | 'renomear' | 'apagar'>(null);
  return (
    <>
      <MenuAcoes
        titulo={aluno.nome}
        rotuloBotao="Ações do aluno"
        acoes={[
          { rotulo: 'Renomear', icone: Pencil, aoEscolher: () => setPainel('renomear') },
          { rotulo: 'Enviar arquivo', icone: FileUp, aoEscolher: () => router.push(`/alunos/${aluno.id}/enviar`) },
          { rotulo: 'Apagar aluno', icone: Trash2, perigoso: true, aoEscolher: () => setPainel('apagar') },
        ]}
      />
      {painel === 'renomear' && (
        <PainelNome
          titulo="Renomear aluno"
          rotulo="Nome do aluno"
          textoBotao="Salvar"
          inicial={aluno.nome}
          onFechar={() => setPainel(null)}
          onSalvar={async (nome) => {
            await renomearAluno(clienteNavegador(), aluno.id, nome);
            router.refresh();
          }}
        />
      )}
      {painel === 'apagar' && (
        <ConfirmarApagar
          escopo={{ tipo: 'aluno', id: aluno.id }}
          descricao={aluno.nome}
          depois={`/turmas/${aluno.turma_id}`}
          onFechar={() => setPainel(null)}
        />
      )}
    </>
  );
}
