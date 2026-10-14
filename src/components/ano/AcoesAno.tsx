'use client';

import { Archive, ArchiveRestore, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ConfirmarApagar } from '@/components/ui/ConfirmarApagar';
import { MenuAcoes } from '@/components/ui/MenuAcoes';
import { definirArquivado } from '@/lib/dados/anos';
import { mensagemErro } from '@/lib/mensagemErro';
import { clienteNavegador } from '@/lib/supabase/navegador';
import type { AnoLetivo } from '@/lib/tipos';

export function AcoesAno({ ano }: { ano: AnoLetivo }) {
  const router = useRouter();
  const [apagando, setApagando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function alternarArquivado() {
    setErro(null);
    try {
      await definirArquivado(clienteNavegador(), ano.id, !ano.arquivado);
      router.refresh();
    } catch (e) {
      setErro(mensagemErro(e));
    }
  }

  return (
    <>
      <MenuAcoes
        titulo={String(ano.ano)}
        rotuloBotao="Ações do ano"
        acoes={[
          ano.arquivado
            ? { rotulo: 'Desarquivar ano', icone: ArchiveRestore, aoEscolher: alternarArquivado }
            : { rotulo: 'Arquivar ano', icone: Archive, aoEscolher: alternarArquivado },
          { rotulo: 'Apagar ano', icone: Trash2, perigoso: true, aoEscolher: () => setApagando(true) },
        ]}
      />
      {erro && <p role="alert" className="text-sm text-red-600">{erro}</p>}
      {apagando && (
        <ConfirmarApagar escopo={{ tipo: 'ano', id: ano.id }} descricao={`o ano ${ano.ano}`} depois="/mais" onFechar={() => setApagando(false)} />
      )}
    </>
  );
}
