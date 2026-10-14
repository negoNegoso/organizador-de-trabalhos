'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { EnviarArquivos } from '@/components/envio/EnviarArquivos';
import { BuscarAluno } from '@/components/ui/BuscarAluno';
import { listarAtividades } from '@/lib/dados/atividades';
import { lerCompartilhados, limparCompartilhados } from '@/lib/compartilhar';
import { clienteNavegador } from '@/lib/supabase/navegador';
import type { Atividade, ResultadoBusca } from '@/lib/tipos';

export default function PaginaCompartilhar() {
  const [arquivos, setArquivos] = useState<File[] | null>(null);
  const [aluno, setAluno] = useState<ResultadoBusca | null>(null);
  const [atividades, setAtividades] = useState<Atividade[] | null>(null);

  useEffect(() => {
    lerCompartilhados().then(setArquivos, () => setArquivos([]));
  }, []);

  useEffect(() => {
    if (!aluno) return;
    let vivo = true;
    void listarAtividades(clienteNavegador(), aluno.turma.id).then((a) => vivo && setAtividades(a));
    return () => {
      vivo = false;
    };
  }, [aluno]);

  if (arquivos === null) return <p>Carregando…</p>;
  if (!arquivos.length) {
    return (
      <p>
        Nada recebido. <Link href="/" className="text-blue-700">Voltar ao início</Link>
      </p>
    );
  }
  if (!aluno) {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-semibold">Recebido: {arquivos.length} arquivo(s)</h1>
        <BuscarAluno rotulo="Para qual aluno?" onEscolher={setAluno} />
      </div>
    );
  }
  if (!atividades) return <p>Carregando…</p>;
  return (
    <EnviarArquivos
      aluno={{ id: aluno.id, nome: aluno.nome }}
      atividades={atividades}
      arquivosIniciais={arquivos}
      voltarPara={`/alunos/${aluno.id}`}
      aoEnfileirar={() => limparCompartilhados()}
    />
  );
}
