'use client';

import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useId, useState, type FormEvent } from 'react';
import { MenuInferior } from '@/components/ui/MenuInferior';
import { SeletorCor } from '@/components/ui/SeletorCor';
import { criarTurma } from '@/lib/dados/turmas';
import { limparNome } from '@/lib/dominio/nomes';
import { mensagemErro } from '@/lib/mensagemErro';
import { clienteNavegador } from '@/lib/supabase/navegador';
import { sugerirCor, type CorTurma } from '@/lib/ui/cores';

type Props = { anoId: string; coresUsadas: CorTurma[] };

function FormTurma({ anoId, coresUsadas, onFechar }: Props & { onFechar: () => void }) {
  const router = useRouter();
  const id = useId();
  const [nome, setNome] = useState('');
  const [cor, setCor] = useState<CorTurma>(() => sugerirCor(coresUsadas));
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function criar(e: FormEvent) {
    e.preventDefault();
    const limpo = limparNome(nome);
    if (!limpo) return;
    setOcupado(true);
    setErro(null);
    try {
      await criarTurma(clienteNavegador(), anoId, limpo, cor);
      onFechar();
      router.refresh();
    } catch (err) {
      setErro(mensagemErro(err));
    } finally {
      setOcupado(false);
    }
  }

  return (
    <MenuInferior aberto titulo="Nova turma" onFechar={onFechar}>
      <form onSubmit={criar} className="space-y-4">
        <div>
          <label htmlFor={id} className="block text-sm">Nome da turma</label>
          <input id={id} autoFocus value={nome} onChange={(e) => setNome(e.target.value)} placeholder="ex.: 3º A" className="mt-1 h-12 w-full rounded-xl border border-slate-200 px-3" />
        </div>
        <div>
          <p className="mb-2 text-sm">Cor</p>
          <SeletorCor valor={cor} onMudar={setCor} />
        </div>
        {erro && <p role="alert" className="text-sm text-red-600">{erro}</p>}
        <button disabled={ocupado} className="h-12 w-full rounded-xl bg-blue-600 font-medium text-white disabled:opacity-50">Criar turma</button>
      </form>
    </MenuInferior>
  );
}

export function NovaTurma({ anoId, coresUsadas }: Props) {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setAberto(true)} className="inline-flex h-11 items-center gap-1 rounded-full px-3 font-medium text-blue-600 hover:bg-blue-50">
        <Plus aria-hidden className="h-5 w-5" />
        Nova turma
      </button>
      {aberto && <FormTurma anoId={anoId} coresUsadas={coresUsadas} onFechar={() => setAberto(false)} />}
    </>
  );
}
