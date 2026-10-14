'use client';

import { useRouter } from 'next/navigation';
import { BotaoApagar } from '@/components/ui/BotaoApagar';
import { definirArquivado } from '@/lib/dados/anos';
import { clienteNavegador } from '@/lib/supabase/navegador';
import type { AnoLetivo } from '@/lib/tipos';

export function AcoesAno({ ano }: { ano: AnoLetivo }) {
  const router = useRouter();
  return (
    <div className="flex flex-wrap gap-4">
      <button
        onClick={async () => {
          await definirArquivado(clienteNavegador(), ano.id, !ano.arquivado);
          router.refresh();
        }}
        className="text-sm text-blue-700"
      >
        {ano.arquivado ? 'Desarquivar ano' : 'Arquivar ano'}
      </button>
      <BotaoApagar escopo={{ tipo: 'ano', id: ano.id }} rotulo="Apagar ano" descricao={`o ano ${ano.ano}`} depois="/" />
    </div>
  );
}
