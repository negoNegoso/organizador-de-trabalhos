'use client';

import { useId, useState, type FormEvent } from 'react';
import { limparNome } from '@/lib/dominio/nomes';
import { mensagemErro } from '@/lib/mensagemErro';

type Props = {
  rotulo: string;
  textoBotao: string;
  placeholder?: string;
  inicial?: string;
  autoFocus?: boolean;
  onSalvar: (nome: string) => Promise<void>;
};

export function FormNome({ rotulo, textoBotao, placeholder, inicial = '', autoFocus, onSalvar }: Props) {
  const id = useId();
  const [valor, setValor] = useState(inicial);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    const nome = limparNome(valor);
    if (!nome) return;
    setOcupado(true);
    setErro(null);
    try {
      await onSalvar(nome);
      setValor('');
    } catch (err) {
      setErro(mensagemErro(err));
    } finally {
      setOcupado(false);
    }
  }

  return (
    <form onSubmit={enviar} className="flex flex-wrap items-end gap-2">
      <div className="min-w-0 flex-1">
        <label htmlFor={id} className="block text-sm">{rotulo}</label>
        <input id={id} value={valor} onChange={(e) => setValor(e.target.value)} placeholder={placeholder} autoFocus={autoFocus} className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3" />
      </div>
      <button disabled={ocupado} className="h-12 rounded-xl bg-blue-600 px-4 font-medium text-white disabled:opacity-50">{textoBotao}</button>
      {erro && <p role="alert" className="w-full text-sm text-red-600">{erro}</p>}
    </form>
  );
}
