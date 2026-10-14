'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FormNome } from '@/components/ui/FormNome';
import { criarAtividade, listarAtividades } from '@/lib/dados/atividades';
import { listarTurmas } from '@/lib/dados/turmas';
import { hojeIso } from '@/lib/dominio/formato';
import { clienteNavegador } from '@/lib/supabase/navegador';
import type { AnoLetivo, Atividade, Turma } from '@/lib/tipos';

type Opcao = { valor: string; rotulo: string };

function Campo({ rotulo, valor, opcoes, vazio, onMudar }: { rotulo: string; valor: string; opcoes: Opcao[]; vazio?: string; onMudar: (v: string) => void }) {
  return (
    <label className="block text-sm">
      {rotulo}
      <select value={valor} onChange={(e) => onMudar(e.target.value)} className="mt-1 h-12 w-full rounded-xl border border-slate-200 bg-white px-3">
        {vazio && <option value="">{vazio}</option>}
        {opcoes.map((o) => <option key={o.valor} value={o.valor}>{o.rotulo}</option>)}
      </select>
    </label>
  );
}

export function EscolherLote({ anos }: { anos: AnoLetivo[] }) {
  const router = useRouter();
  const sb = clienteNavegador();
  const [anoId, setAnoId] = useState(anos[0]?.id ?? '');
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [turmaId, setTurmaId] = useState('');
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [atividadeId, setAtividadeId] = useState('');

  useEffect(() => {
    if (!anoId) return;
    let vivo = true;
    void listarTurmas(sb, anoId).then((t) => vivo && setTurmas(t));
    return () => {
      vivo = false;
    };
  }, [anoId, sb]);

  useEffect(() => {
    if (!turmaId) return;
    let vivo = true;
    void listarAtividades(sb, turmaId).then((a) => vivo && setAtividades(a));
    return () => {
      vivo = false;
    };
  }, [turmaId, sb]);

  if (!anos.length) {
    return (
      <p className="text-sm">
        Crie um ano letivo e uma turma primeiro. <Link href="/" className="text-blue-700">Voltar ao início</Link>
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <Campo
        rotulo="Ano letivo"
        valor={anoId}
        opcoes={anos.map((a) => ({ valor: a.id, rotulo: String(a.ano) }))}
        onMudar={(v) => {
          if (v === anoId) return;
          setAnoId(v);
          setTurmas([]);
          setTurmaId('');
          setAtividades([]);
          setAtividadeId('');
        }}
      />
      <Campo
        rotulo="Turma"
        valor={turmaId}
        vazio="Escolha a turma"
        opcoes={turmas.map((t) => ({ valor: t.id, rotulo: t.nome }))}
        onMudar={(v) => {
          if (v === turmaId) return;
          setTurmaId(v);
          setAtividades([]);
          setAtividadeId('');
        }}
      />
      {turmaId && (
        <>
          <Campo
            rotulo="Atividade"
            valor={atividadeId}
            vazio="Escolha a atividade"
            opcoes={atividades.map((a) => ({ valor: a.id, rotulo: a.nome }))}
            onMudar={setAtividadeId}
          />
          <FormNome
            rotulo="Ou crie uma nova atividade"
            textoBotao="Criar"
            onSalvar={async (nome) => {
              const nova = await criarAtividade(sb, turmaId, nome, hojeIso());
              setAtividades((l) => [nova, ...l]);
              setAtividadeId(nova.id);
            }}
          />
        </>
      )}
      <button
        disabled={!atividadeId}
        onClick={() => router.push(`/lote/${atividadeId}`)}
        className="h-12 w-full rounded-xl bg-blue-600 font-medium text-white disabled:opacity-50"
      >
        Começar
      </button>
    </div>
  );
}
