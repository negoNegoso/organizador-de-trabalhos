'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { clienteNavegador } from '@/lib/supabase/navegador';

export function FormLogin() {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function entrar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const dados = new FormData(e.currentTarget);
    setEnviando(true);
    setErro(null);
    const { error } = await clienteNavegador().auth.signInWithPassword({
      email: String(dados.get('email')),
      password: String(dados.get('senha')),
    });
    setEnviando(false);
    if (error) {
      setErro('Email ou senha incorretos.');
      return;
    }
    router.replace('/');
    router.refresh();
  }

  return (
    <form onSubmit={entrar} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm">Email</label>
        <input id="email" name="email" type="email" required autoComplete="email" className="w-full rounded-xl border px-3 py-2" />
      </div>
      <div>
        <label htmlFor="senha" className="block text-sm">Senha</label>
        <input id="senha" name="senha" type="password" required autoComplete="current-password" className="w-full rounded-xl border px-3 py-2" />
      </div>
      {erro && <p role="alert" className="text-sm text-red-600">{erro}</p>}
      <button disabled={enviando} className="w-full rounded bg-blue-700 py-2 text-white disabled:opacity-50">
        Entrar
      </button>
    </form>
  );
}
