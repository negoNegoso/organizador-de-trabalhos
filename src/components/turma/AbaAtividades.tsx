'use client';

import { Camera, Pencil, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { BarraProgresso } from '@/components/ui/BarraProgresso';
import { Confirmar } from '@/components/ui/Confirmar';
import { FormNome } from '@/components/ui/FormNome';
import { MenuAcoes } from '@/components/ui/MenuAcoes';
import { MenuInferior } from '@/components/ui/MenuInferior';
import { PainelNome } from '@/components/ui/PainelNome';
import { apagarAtividade, criarAtividade, renomearAtividade } from '@/lib/dados/atividades';
import { calcularEntregas } from '@/lib/dominio/entregas';
import { formatarData } from '@/lib/dominio/formato';
import { mensagemErro } from '@/lib/mensagemErro';
import { clienteNavegador } from '@/lib/supabase/navegador';
import type { Aluno, Atividade } from '@/lib/tipos';

type Props = { turmaId: string; atividades: Atividade[]; alunos: Aluno[]; entregas: Record<string, string[]> };

function NovaAtividade({ turmaId, onFechar }: { turmaId: string; onFechar: () => void }) {
  const router = useRouter();
  const [data, setData] = useState('');
  return (
    <MenuInferior aberto titulo="Nova atividade" onFechar={onFechar}>
      <div className="space-y-3">
        <label className="block text-sm">
          Data (opcional)
          <input type="date" value={data} onChange={(e) => setData(e.target.value)} className="mt-1 h-12 w-full rounded-xl border border-slate-200 px-3" />
        </label>
        <FormNome
          rotulo="Nome da atividade"
          textoBotao="Criar atividade"
          autoFocus
          onSalvar={async (nome) => {
            await criarAtividade(clienteNavegador(), turmaId, nome, data || null);
            onFechar();
            router.refresh();
          }}
        />
      </div>
    </MenuInferior>
  );
}

function ApagarAtividade({ atividade, onFechar }: { atividade: Atividade; onFechar: () => void }) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  return (
    <Confirmar
      titulo={`Apagar a atividade ${atividade.nome}?`}
      mensagem="Os arquivos continuam nas pastas dos alunos, em “Outros”."
      textoConfirmar="Apagar"
      ocupado={ocupado}
      erro={erro}
      onCancelar={onFechar}
      onConfirmar={async () => {
        setOcupado(true);
        setErro(null);
        try {
          await apagarAtividade(clienteNavegador(), atividade.id);
          onFechar();
          router.refresh();
        } catch (e) {
          setErro(mensagemErro(e));
        } finally {
          setOcupado(false);
        }
      }}
    />
  );
}

function CartaoAtividade({ atividade, alunos, entregues }: { atividade: Atividade; alunos: Aluno[]; entregues: Set<string> }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [painel, setPainel] = useState<null | 'renomear' | 'apagar'>(null);
  const { entregues: ok, faltam } = calcularEntregas(alunos, entregues);

  return (
    <li className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex items-start gap-1">
        <button type="button" aria-expanded={aberto} onClick={() => setAberto((a) => !a)} className="min-w-0 flex-1 text-left">
          <span className="flex justify-between gap-2">
            <span className="truncate font-semibold">{atividade.nome}</span>
            {atividade.data && <span className="shrink-0 text-sm text-slate-500">{formatarData(atividade.data)}</span>}
          </span>
          <span className="mt-2 block">
            <BarraProgresso valor={ok.length} total={alunos.length} />
          </span>
        </button>
        <MenuAcoes
          titulo={atividade.nome}
          rotuloBotao={`Ações da atividade ${atividade.nome}`}
          acoes={[
            { rotulo: 'Renomear', icone: Pencil, aoEscolher: () => setPainel('renomear') },
            { rotulo: 'Apagar atividade', icone: Trash2, perigoso: true, aoEscolher: () => setPainel('apagar') },
          ]}
        />
      </div>
      {aberto && (
        <div className="mt-3 space-y-3 border-t border-slate-100 pt-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="min-w-0">
              <h4 className="font-medium">Faltam ({faltam.length})</h4>
              <ul>{faltam.map((a) => <li key={a.id} className="truncate">{a.nome}</li>)}</ul>
            </div>
            <div className="min-w-0">
              <h4 className="font-medium">Entregaram ({ok.length})</h4>
              <ul>{ok.map((a) => <li key={a.id} className="truncate">{a.nome}</li>)}</ul>
            </div>
          </div>
          <Link href={`/lote/${atividade.id}`} className="flex h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 font-medium text-white">
            <Camera aria-hidden className="h-5 w-5" />
            Escanear esta atividade
          </Link>
        </div>
      )}
      {painel === 'renomear' && (
        <PainelNome
          titulo="Renomear atividade"
          rotulo="Nome da atividade"
          textoBotao="Salvar"
          inicial={atividade.nome}
          onFechar={() => setPainel(null)}
          onSalvar={async (nome) => {
            await renomearAtividade(clienteNavegador(), atividade.id, nome);
            router.refresh();
          }}
        />
      )}
      {painel === 'apagar' && <ApagarAtividade atividade={atividade} onFechar={() => setPainel(null)} />}
    </li>
  );
}

export function AbaAtividades({ turmaId, atividades, alunos, entregas }: Props) {
  const [nova, setNova] = useState(false);
  return (
    <div className="space-y-2">
      <button type="button" onClick={() => setNova(true)} className="inline-flex h-11 items-center gap-1 font-medium text-blue-600">
        <Plus aria-hidden className="h-5 w-5" />
        Nova atividade
      </button>
      {nova && <NovaAtividade turmaId={turmaId} onFechar={() => setNova(false)} />}
      {atividades.length === 0 && <p className="text-sm text-slate-500">Nenhuma atividade ainda.</p>}
      <ul className="space-y-2">
        {atividades.map((at) => (
          <CartaoAtividade key={at.id} atividade={at} alunos={alunos} entregues={new Set(entregas[at.id] ?? [])} />
        ))}
      </ul>
    </div>
  );
}
