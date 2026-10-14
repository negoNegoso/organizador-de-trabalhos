'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { criarAno } from '@/lib/dados/anos';
import { mensagemErro } from '@/lib/mensagemErro';
import { clienteNavegador } from '@/lib/supabase/navegador';

export function NovoAno() {
  const router = useRouter();
  const [ano, setAno] = useState(String(new Date().getFullYear()));
  const [erro, setErro] = useState<string | null>(null);

  async function criar(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    try {
      await criarAno(clienteNavegador(), Number(ano));
      router.refresh();
    } catch (err) {
      setErro(mensagemErro(err));
    }
  }

  return (
    <form onSubmit={criar} className="flex flex-wrap items-end gap-2">
      <div>
        <label htmlFor="novo-ano" className="block text-sm">Ano</label>
        <input id="novo-ano" type="number" min={2000} max={2100} value={ano} onChange={(e) => setAno(e.target.value)} className="w-28 rounded border px-3 py-2" />
      </div>
      <button className="rounded bg-blue-700 px-4 py-2 text-white">Criar ano</button>
      {erro && <p role="alert" className="w-full text-sm text-red-600">{erro}</p>}
    </form>
  );
}
