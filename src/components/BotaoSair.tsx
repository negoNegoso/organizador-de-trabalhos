'use client';

import { useRouter } from 'next/navigation';
import { clienteNavegador } from '@/lib/supabase/navegador';

export function BotaoSair() {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await clienteNavegador().auth.signOut();
        router.replace('/login');
        router.refresh();
      }}
      className="text-sm text-gray-600"
    >
      Sair
    </button>
  );
}
