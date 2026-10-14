'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { apagar, contarArquivos } from '@/lib/dados/apagar';
import { mensagemErro } from '@/lib/mensagemErro';
import { clienteNavegador } from '@/lib/supabase/navegador';
import type { Escopo } from '@/lib/tipos';
import { Confirmar } from './Confirmar';

type Props = { escopo: Escopo; rotulo: string; descricao: string; depois: string | 'refresh' };

export function BotaoApagar({ escopo, rotulo, descricao, depois }: Props) {
  const router = useRouter();
  const [quantidade, setQuantidade] = useState<number | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function abrir() {
    setErro(null);
    try {
      setQuantidade(await contarArquivos(clienteNavegador(), escopo));
    } catch (e) {
      setErro(mensagemErro(e));
    }
  }

  async function confirmar() {
    setOcupado(true);
    setErro(null);
    try {
      await apagar(clienteNavegador(), escopo);
      setQuantidade(null);
      if (depois !== 'refresh') router.push(depois);
      router.refresh();
    } catch (e) {
      setErro(mensagemErro(e));
    } finally {
      setOcupado(false);
    }
  }

  const mensagem =
    escopo.tipo === 'arquivo'
      ? 'O arquivo será apagado definitivamente.'
      : `Isso vai apagar ${quantidade} arquivo(s). Não dá para desfazer.`;

  return (
    <>
      <button onClick={abrir} className="text-sm text-red-600">{rotulo}</button>
      {erro && quantidade === null && <p role="alert" className="text-sm text-red-600">{erro}</p>}
      {quantidade !== null && (
        <Confirmar
          titulo={`Apagar ${descricao}?`}
          mensagem={mensagem}
          textoConfirmar="Apagar"
          ocupado={ocupado}
          erro={erro}
          onConfirmar={confirmar}
          onCancelar={() => setQuantidade(null)}
        />
      )}
    </>
  );
}
