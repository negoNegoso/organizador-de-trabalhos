'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { criarAlunos } from '@/lib/dados/alunos';
import { parseNomes } from '@/lib/dominio/nomes';
import { mensagemErro } from '@/lib/mensagemErro';
import { clienteNavegador } from '@/lib/supabase/navegador';

const plural = (n: number, palavra: string) => `${n} ${palavra}${n === 1 ? '' : 's'}`;

export function AdicionarAlunos({ turmaId, existentes }: { turmaId: string; existentes: string[] }) {
  const router = useRouter();
  const [texto, setTexto] = useState('');
  const [resultado, setResultado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function adicionar() {
    const { novos, ignorados } = parseNomes(texto, existentes);
    setOcupado(true);
    setErro(null);
    try {
      await criarAlunos(clienteNavegador(), turmaId, novos);
      setTexto('');
      setResultado(`${plural(novos.length, 'adicionado')}, ${plural(ignorados, 'ignorado')}`);
      router.refresh();
    } catch (e) {
      setErro(mensagemErro(e));
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="space-y-2">
      <label htmlFor="nomes" className="block text-sm">Cole um nome por linha</label>
      <textarea id="nomes" rows={5} value={texto} onChange={(e) => setTexto(e.target.value)} className="w-full rounded border p-2" />
      <button onClick={adicionar} disabled={ocupado || !texto.trim()} className="rounded bg-blue-700 px-4 py-2 text-white disabled:opacity-50">
        Adicionar alunos
      </button>
      {resultado && <p role="status" className="text-sm text-green-700">{resultado}</p>}
      {erro && <p role="alert" className="text-sm text-red-600">{erro}</p>}
    </div>
  );
}
