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
      className="h-12 w-full rounded-xl border border-slate-200 bg-white font-medium text-red-600"
    >
      Sair
    </button>
  );
}
