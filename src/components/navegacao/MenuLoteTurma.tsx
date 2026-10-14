'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FormNome } from '@/components/ui/FormNome';
import { MenuInferior } from '@/components/ui/MenuInferior';
import { listarAlunos } from '@/lib/dados/alunos';
import { criarAtividade, listarAtividades } from '@/lib/dados/atividades';
import { obterTurma } from '@/lib/dados/turmas';
import { formatarData, hojeIso } from '@/lib/dominio/formato';
import { mensagemErro } from '@/lib/mensagemErro';
import { clienteNavegador } from '@/lib/supabase/navegador';
import type { Atividade, TurmaDetalhe } from '@/lib/tipos';

type Dados = { turma: TurmaDetalhe; atividades: Atividade[]; totalAlunos: number };

export function MenuLoteTurma({ turmaId, onFechar }: { turmaId: string; onFechar: () => void }) {
  const router = useRouter();
  const [dados, setDados] = useState<Dados | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let vivo = true;
    const sb = clienteNavegador();
    Promise.all([obterTurma(sb, turmaId), listarAtividades(sb, turmaId), listarAlunos(sb, turmaId)]).then(
      ([turma, atividades, alunos]) => vivo && setDados({ turma, atividades, totalAlunos: alunos.length }),
      (e) => vivo && setErro(mensagemErro(e)),
    );
    return () => {
      vivo = false;
    };
  }, [turmaId, tentativa]);

  const irParaLote = (atividadeId: string) => {
    onFechar();
    router.push(`/lote/${atividadeId}`);
  };

  return (
    <MenuInferior aberto titulo={dados ? `Escanear lote — ${dados.turma.nome}` : 'Escanear lote'} onFechar={onFechar}>
      {erro ? (
        <div className="space-y-3">
          <p role="alert" className="text-sm text-red-600">{erro}</p>
          <button
            type="button"
            onClick={() => {
              setErro(null);
              setTentativa((t) => t + 1);
            }}
            className="h-12 w-full rounded-xl border border-slate-200 font-medium"
          >
            Tentar de novo
          </button>
        </div>
      ) : !dados ? (
        <p className="text-sm text-slate-500">Carregando…</p>
      ) : dados.totalAlunos === 0 ? (
        <div className="space-y-3">
          <p className="text-slate-600">Adicione alunos primeiro.</p>
          <Link href={`/turmas/${turmaId}?aba=alunos`} onClick={onFechar} className="flex h-12 items-center justify-center rounded-xl bg-blue-600 font-medium text-white">
            Ir para os alunos
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {dados.atividades.length > 0 && (
            <div>
              <p className="mb-1 text-sm text-slate-500">Escolha a atividade</p>
              <ul className="-mx-2">
                {dados.atividades.map((a) => (
                  <li key={a.id}>
                    <button type="button" onClick={() => irParaLote(a.id)} className="flex h-12 w-full items-center justify-between gap-2 rounded-xl px-2 text-left hover:bg-slate-50">
                      <span className="truncate font-medium">{a.nome}</span>
                      {a.data && <span aria-hidden className="shrink-0 text-sm text-slate-500">{formatarData(a.data)}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <FormNome
            rotulo="Nova atividade"
            textoBotao="Criar e escanear"
            autoFocus={dados.atividades.length === 0}
            onSalvar={async (nome) => {
              const nova = await criarAtividade(clienteNavegador(), turmaId, nome, hojeIso());
              irParaLote(nova.id);
            }}
          />
        </div>
      )}
    </MenuInferior>
  );
}
