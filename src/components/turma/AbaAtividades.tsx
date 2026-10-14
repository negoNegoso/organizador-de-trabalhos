'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Confirmar } from '@/components/ui/Confirmar';
import { FormNome } from '@/components/ui/FormNome';
import { Renomear } from '@/components/ui/Renomear';
import { apagarAtividade, criarAtividade, renomearAtividade } from '@/lib/dados/atividades';
import { calcularEntregas } from '@/lib/dominio/entregas';
import { formatarData } from '@/lib/dominio/formato';
import { mensagemErro } from '@/lib/mensagemErro';
import { clienteNavegador } from '@/lib/supabase/navegador';
import type { Aluno, Atividade } from '@/lib/tipos';

type Props = { turmaId: string; atividades: Atividade[]; alunos: Aluno[]; entregas: Record<string, string[]> };

function ApagarAtividade({ atividade }: { atividade: Atividade }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  return (
    <>
      <button onClick={() => { setErro(null); setAberto(true); }} className="text-sm text-red-600">Apagar</button>
      {aberto && (
        <Confirmar
          titulo={`Apagar a atividade ${atividade.nome}?`}
          mensagem="Os arquivos continuam nas pastas dos alunos, em “Outros”."
          textoConfirmar="Apagar"
          ocupado={ocupado}
          erro={erro}
          onCancelar={() => setAberto(false)}
          onConfirmar={async () => {
            setOcupado(true);
            setErro(null);
            try {
              await apagarAtividade(clienteNavegador(), atividade.id);
              setAberto(false);
              router.refresh();
            } catch (e) {
              setErro(mensagemErro(e));
            } finally {
              setOcupado(false);
            }
          }}
        />
      )}
    </>
  );
}

export function AbaAtividades({ turmaId, atividades, alunos, entregas }: Props) {
  const router = useRouter();
  const [data, setData] = useState('');

  return (
    <div className="space-y-4">
      <FormNome
        rotulo="Nome da atividade"
        textoBotao="Criar atividade"
        onSalvar={async (nome) => {
          await criarAtividade(clienteNavegador(), turmaId, nome, data || null);
          setData('');
          router.refresh();
        }}
      />
      <label className="block text-sm">
        Data (opcional)
        <input type="date" value={data} onChange={(e) => setData(e.target.value)} className="ml-2 rounded border px-2 py-1" />
      </label>
      <ul className="space-y-2">
        {atividades.map((at) => {
          const { entregues, faltam } = calcularEntregas(alunos, new Set(entregas[at.id] ?? []));
          return (
            <li key={at.id} className="rounded border bg-white p-3">
              <details>
                <summary className="flex cursor-pointer justify-between gap-2">
                  <span>
                    {at.nome}
                    {at.data && <span className="ml-2 text-sm text-gray-500">{formatarData(at.data)}</span>}
                  </span>
                  <span className="text-sm">{entregues.length}/{alunos.length} entregues</span>
                </summary>
                <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <h4 className="font-medium">Faltam</h4>
                    <ul>{faltam.map((a) => <li key={a.id}>{a.nome}</li>)}</ul>
                  </div>
                  <div>
                    <h4 className="font-medium">Entregaram</h4>
                    <ul>{entregues.map((a) => <li key={a.id}>{a.nome}</li>)}</ul>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-4">
                  <Renomear
                    atual={at.nome}
                    onSalvar={async (nome) => {
                      await renomearAtividade(clienteNavegador(), at.id, nome);
                      router.refresh();
                    }}
                  />
                  <ApagarAtividade atividade={at} />
                </div>
              </details>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
