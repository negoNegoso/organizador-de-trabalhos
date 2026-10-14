'use client';

import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { MenuInferior } from '@/components/ui/MenuInferior';
import { criarAlunos } from '@/lib/dados/alunos';
import { plural } from '@/lib/dominio/formato';
import { parseNomes } from '@/lib/dominio/nomes';
import { mensagemErro } from '@/lib/mensagemErro';
import { clienteNavegador } from '@/lib/supabase/navegador';

export function AdicionarAlunos({ turmaId, existentes }: { turmaId: string; existentes: string[] }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
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
      setResultado(`${plural(novos.length, 'adicionado', 'adicionados')}, ${plural(ignorados, 'ignorado', 'ignorados')}`);
      router.refresh();
    } catch (e) {
      setErro(mensagemErro(e));
    } finally {
      setOcupado(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setResultado(null);
          setAberto(true);
        }}
        className="inline-flex h-11 items-center gap-1 font-medium text-blue-600"
      >
        <Plus aria-hidden className="h-5 w-5" />
        Adicionar alunos
      </button>
      <MenuInferior aberto={aberto} titulo="Adicionar alunos" onFechar={() => setAberto(false)}>
        <div className="space-y-3">
          <label htmlFor="nomes" className="block text-sm">Cole um nome por linha</label>
          <textarea id="nomes" rows={6} autoFocus value={texto} onChange={(e) => setTexto(e.target.value)} className="w-full rounded-xl border border-slate-200 p-3" />
          {resultado && <p role="status" className="text-sm text-green-700">{resultado}</p>}
          {erro && <p role="alert" className="text-sm text-red-600">{erro}</p>}
          <button
            type="button"
            onClick={adicionar}
            disabled={ocupado || !texto.trim()}
            className="h-12 w-full rounded-xl bg-blue-600 font-medium text-white disabled:opacity-50"
          >
            Adicionar
          </button>
        </div>
      </MenuInferior>
    </>
  );
}
