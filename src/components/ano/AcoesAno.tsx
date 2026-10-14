'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { BotaoApagar } from '@/components/ui/BotaoApagar';
import { definirArquivado } from '@/lib/dados/anos';
import { mensagemErro } from '@/lib/mensagemErro';
import { clienteNavegador } from '@/lib/supabase/navegador';
import type { AnoLetivo } from '@/lib/tipos';

export function AcoesAno({ ano }: { ano: AnoLetivo }) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  return (
    <div className="flex flex-wrap gap-4">
      <button
        disabled={ocupado}
        onClick={async () => {
          setOcupado(true);
          setErro(null);
          try {
            await definirArquivado(clienteNavegador(), ano.id, !ano.arquivado);
            router.refresh();
          } catch (e) {
            setErro(mensagemErro(e));
          } finally {
            setOcupado(false);
          }
        }}
        className="text-sm text-blue-700 disabled:opacity-50"
      >
        {ano.arquivado ? 'Desarquivar ano' : 'Arquivar ano'}
      </button>
      <BotaoApagar escopo={{ tipo: 'ano', id: ano.id }} rotulo="Apagar ano" descricao={`o ano ${ano.ano}`} depois="/" />
      {erro && <p role="alert" className="w-full text-sm text-red-600">{erro}</p>}
    </div>
  );
}
