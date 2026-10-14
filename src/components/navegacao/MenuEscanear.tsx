'use client';

import { FileUp, Layers, UserRound, type LucideIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { BuscarAluno } from '@/components/ui/BuscarAluno';
import { MenuInferior } from '@/components/ui/MenuInferior';

type Etapa = 'opcoes' | 'escanear' | 'enviar';

const TITULO: Record<Etapa, string> = {
  opcoes: 'O que você quer fazer?',
  escanear: 'Escanear para qual aluno?',
  enviar: 'Enviar para qual aluno?',
};

function Opcao({ Icone, titulo, detalhe, cor, onClick }: { Icone: LucideIcon; titulo: string; detalhe: string; cor: string; onClick: () => void }) {
  return (
    <li>
      <button type="button" onClick={onClick} className="flex w-full items-center gap-3 rounded-xl px-2 py-3 text-left hover:bg-slate-50">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${cor}`}>
          <Icone aria-hidden className="h-5 w-5" />
        </span>
        <span>
          <span className="block font-medium">{titulo}</span>
          <span className="block text-sm text-slate-500">{detalhe}</span>
        </span>
      </button>
    </li>
  );
}

export function MenuEscanear({ onFechar }: { onFechar: () => void }) {
  const router = useRouter();
  const [etapa, setEtapa] = useState<Etapa>('opcoes');
  const ir = (href: string) => {
    onFechar();
    router.push(href);
  };

  return (
    <MenuInferior aberto titulo={TITULO[etapa]} onFechar={onFechar}>
      {etapa === 'opcoes' ? (
        <ul className="-mx-2">
          <Opcao Icone={Layers} titulo="Escanear lote" detalhe="Uma atividade, vários alunos" cor="bg-blue-100 text-blue-700" onClick={() => ir('/lote')} />
          <Opcao Icone={UserRound} titulo="Escanear para um aluno" detalhe="Buscar o aluno e abrir a câmera" cor="bg-green-100 text-green-700" onClick={() => setEtapa('escanear')} />
          <Opcao Icone={FileUp} titulo="Enviar arquivo" detalhe="PDF ou fotos do celular" cor="bg-orange-100 text-orange-700" onClick={() => setEtapa('enviar')} />
        </ul>
      ) : (
        <BuscarAluno
          rotulo="Nome do aluno"
          autoFocus
          onEscolher={(r) => ir(`/alunos/${r.id}/${etapa === 'escanear' ? 'escanear' : 'enviar'}`)}
        />
      )}
    </MenuInferior>
  );
}
