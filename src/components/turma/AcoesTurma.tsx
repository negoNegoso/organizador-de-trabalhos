'use client';

import { Palette, Pencil, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ConfirmarApagar } from '@/components/ui/ConfirmarApagar';
import { MenuAcoes } from '@/components/ui/MenuAcoes';
import { MenuInferior } from '@/components/ui/MenuInferior';
import { PainelNome } from '@/components/ui/PainelNome';
import { SeletorCor } from '@/components/ui/SeletorCor';
import { definirCorTurma, renomearTurma } from '@/lib/dados/turmas';
import { mensagemErro } from '@/lib/mensagemErro';
import { clienteNavegador } from '@/lib/supabase/navegador';
import type { Turma } from '@/lib/tipos';

function PainelCor({ turma, onFechar }: { turma: Turma; onFechar: () => void }) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  return (
    <MenuInferior aberto titulo="Cor da turma" onFechar={onFechar}>
      <SeletorCor
        valor={turma.cor}
        onMudar={async (cor) => {
          setErro(null);
          try {
            await definirCorTurma(clienteNavegador(), turma.id, cor);
            onFechar();
            router.refresh();
          } catch (e) {
            setErro(mensagemErro(e));
          }
        }}
      />
      {erro && <p role="alert" className="mt-3 text-sm text-red-600">{erro}</p>}
    </MenuInferior>
  );
}

export function AcoesTurma({ turma }: { turma: Turma }) {
  const router = useRouter();
  const [painel, setPainel] = useState<null | 'renomear' | 'cor' | 'apagar'>(null);
  const fechar = () => setPainel(null);
  return (
    <>
      <MenuAcoes
        claro
        titulo={turma.nome}
        rotuloBotao="Ações da turma"
        acoes={[
          { rotulo: 'Renomear', icone: Pencil, aoEscolher: () => setPainel('renomear') },
          { rotulo: 'Mudar cor', icone: Palette, aoEscolher: () => setPainel('cor') },
          { rotulo: 'Apagar turma', icone: Trash2, perigoso: true, aoEscolher: () => setPainel('apagar') },
        ]}
      />
      {painel === 'renomear' && (
        <PainelNome
          titulo="Renomear turma"
          rotulo="Nome da turma"
          textoBotao="Salvar"
          inicial={turma.nome}
          onFechar={fechar}
          onSalvar={async (nome) => {
            await renomearTurma(clienteNavegador(), turma.id, nome);
            router.refresh();
          }}
        />
      )}
      {painel === 'cor' && <PainelCor turma={turma} onFechar={fechar} />}
      {painel === 'apagar' && (
        <ConfirmarApagar
          escopo={{ tipo: 'turma', id: turma.id }}
          descricao={`a turma ${turma.nome}`}
          depois={`/anos/${turma.ano_letivo_id}`}
          onFechar={fechar}
        />
      )}
    </>
  );
}
