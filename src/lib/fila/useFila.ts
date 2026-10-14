'use client';

import { useEffect, useState } from 'react';
import { clienteNavegador } from '../supabase/navegador';
import { criarEnviar } from './enviar';
import { abrirFila, type Fila, type ItemFila } from './fila';
import { criarExecutorUnico } from './executor';
import { processarFila } from './processar';

const EVENTO = 'fila-mudou';
let filaPromessa: Promise<Fila> | null = null;

function obterFila(): Promise<Fila> {
  filaPromessa ??= abrirFila().catch((e) => {
    filaPromessa = null;
    throw e;
  });
  return filaPromessa;
}

function avisar() {
  window.dispatchEvent(new Event(EVENTO));
}

export const processarAgora = criarExecutorUnico(async () => {
  try {
    await processarFila(await obterFila(), criarEnviar(clienteNavegador()), avisar);
  } finally {
    avisar();
  }
});

const processarEmSegundoPlano = () => void processarAgora().catch(() => {});

export async function enfileirar(item: ItemFila): Promise<void> {
  await (await obterFila()).adicionar(item);
  avisar();
  processarEmSegundoPlano();
}

export function useFila() {
  const [itens, setItens] = useState<ItemFila[]>([]);

  useEffect(() => {
    let vivo = true;
    const atualizar = async () => {
      const lista = await (await obterFila()).listar();
      if (vivo) setItens(lista);
    };
    const online = processarEmSegundoPlano;
    void atualizar();
    processarEmSegundoPlano();
    window.addEventListener(EVENTO, atualizar);
    window.addEventListener('online', online);
    return () => {
      vivo = false;
      window.removeEventListener(EVENTO, atualizar);
      window.removeEventListener('online', online);
    };
  }, []);

  return {
    itens,
    processar: processarAgora,
    descartar: async (id: string) => {
      await (await obterFila()).remover(id);
      avisar();
    },
  };
}
