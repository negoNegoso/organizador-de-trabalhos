'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apagar, contarArquivos } from '@/lib/dados/apagar';
import { mensagemErro } from '@/lib/mensagemErro';
import { clienteNavegador } from '@/lib/supabase/navegador';
import type { Escopo } from '@/lib/tipos';
import { Confirmar } from './Confirmar';

type Props = { escopo: Escopo; descricao: string; depois: string | 'refresh'; onFechar: () => void };

export function ConfirmarApagar({ escopo, descricao, depois, onFechar }: Props) {
  const router = useRouter();
  const ehArquivo = escopo.tipo === 'arquivo';
  const [quantidade, setQuantidade] = useState<number | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (ehArquivo) return;
    let vivo = true;
    contarArquivos(clienteNavegador(), escopo).then(
      (n) => vivo && setQuantidade(n),
      (e) => vivo && setErro(mensagemErro(e)),
    );
    return () => {
      vivo = false;
    };
  }, [escopo, ehArquivo]);

  async function confirmar() {
    setOcupado(true);
    setErro(null);
    try {
      await apagar(clienteNavegador(), escopo);
      onFechar();
      if (depois !== 'refresh') router.push(depois);
      router.refresh();
    } catch (e) {
      setErro(mensagemErro(e));
    } finally {
      setOcupado(false);
    }
  }

  const mensagem = ehArquivo
    ? 'O arquivo será apagado definitivamente.'
    : quantidade === null
      ? 'Contando arquivos…'
      : `Isso vai apagar ${quantidade} arquivo(s). Não dá para desfazer.`;

  return (
    <Confirmar
      titulo={`Apagar ${descricao}?`}
      mensagem={mensagem}
      textoConfirmar="Apagar"
      ocupado={ocupado || (!ehArquivo && quantidade === null)}
      erro={erro}
      onConfirmar={confirmar}
      onCancelar={onFechar}
    />
  );
}
