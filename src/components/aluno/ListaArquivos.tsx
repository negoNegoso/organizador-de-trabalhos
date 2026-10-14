'use client';

import { ArrowRightLeft, Download, FileText, Pencil, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { BuscarAluno } from '@/components/ui/BuscarAluno';
import { ConfirmarApagar } from '@/components/ui/ConfirmarApagar';
import { MenuAcoes } from '@/components/ui/MenuAcoes';
import { MenuInferior } from '@/components/ui/MenuInferior';
import { PainelNome } from '@/components/ui/PainelNome';
import { moverArquivo, renomearArquivo } from '@/lib/dados/arquivos';
import type { Grupo } from '@/lib/dominio/agrupar';
import { mensagemErro } from '@/lib/mensagemErro';
import { clienteNavegador } from '@/lib/supabase/navegador';
import type { Arquivo } from '@/lib/tipos';

function PainelMover({ arquivo, alunoId, onFechar }: { arquivo: Arquivo; alunoId: string; onFechar: () => void }) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  return (
    <MenuInferior aberto titulo="Mover para qual aluno?" onFechar={onFechar}>
      <BuscarAluno
        rotulo="Nome do aluno"
        autoFocus
        excluirId={alunoId}
        onEscolher={async (r) => {
          setErro(null);
          try {
            await moverArquivo(clienteNavegador(), arquivo, { id: r.id, turma_id: r.turma.id });
            onFechar();
            router.refresh();
          } catch (e) {
            setErro(mensagemErro(e));
          }
        }}
      />
      {erro && <p role="alert" className="mt-3 text-sm text-red-600">{erro}</p>}
    </MenuInferior>
  );
}

function CartaoArquivo({ arquivo, alunoId }: { arquivo: Arquivo; alunoId: string }) {
  const router = useRouter();
  const [painel, setPainel] = useState<null | 'renomear' | 'mover' | 'apagar'>(null);
  const fechar = () => setPainel(null);

  return (
    <li data-testid="arquivo" className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2">
      <a href={`/arquivos/${arquivo.id}`} target="_blank" rel="noreferrer" className="flex min-w-0 flex-1 items-center gap-3">
        {arquivo.tem_miniatura ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/arquivos/${arquivo.id}?miniatura=1`} alt="" className="h-16 w-12 shrink-0 rounded-md border border-slate-200 object-cover" />
        ) : (
          <span className="flex h-16 w-12 shrink-0 items-center justify-center rounded-md border border-slate-200 text-slate-400">
            <FileText aria-hidden className="h-6 w-6" />
          </span>
        )}
        <span className="min-w-0">
          <span className="block truncate font-medium">{arquivo.titulo}</span>
          <span className="block text-xs text-slate-500">
            {new Date(arquivo.criado_em).toLocaleDateString('pt-BR')} · {arquivo.paginas} página(s)
          </span>
        </span>
      </a>
      <MenuAcoes
        titulo={arquivo.titulo}
        rotuloBotao="Ações do arquivo"
        acoes={[
          { rotulo: 'Baixar', icone: Download, aoEscolher: () => window.location.assign(new URL(`/arquivos/${arquivo.id}?download=1`, window.location.origin).href) },
          { rotulo: 'Renomear', icone: Pencil, aoEscolher: () => setPainel('renomear') },
          { rotulo: 'Mover para outro aluno', icone: ArrowRightLeft, aoEscolher: () => setPainel('mover') },
          { rotulo: 'Apagar', icone: Trash2, perigoso: true, aoEscolher: () => setPainel('apagar') },
        ]}
      />
      {painel === 'renomear' && (
        <PainelNome
          titulo="Renomear arquivo"
          rotulo="Novo nome"
          textoBotao="Salvar"
          inicial={arquivo.titulo}
          onFechar={fechar}
          onSalvar={async (titulo) => {
            await renomearArquivo(clienteNavegador(), arquivo.id, titulo);
            router.refresh();
          }}
        />
      )}
      {painel === 'mover' && <PainelMover arquivo={arquivo} alunoId={alunoId} onFechar={fechar} />}
      {painel === 'apagar' && (
        <ConfirmarApagar escopo={{ tipo: 'arquivo', id: arquivo.id }} descricao={`“${arquivo.titulo}”`} depois="refresh" onFechar={fechar} />
      )}
    </li>
  );
}

export function ListaArquivos({ grupos, alunoId }: { grupos: Grupo[]; alunoId: string }) {
  if (!grupos.length) return <p className="text-sm text-slate-500">Nenhum arquivo ainda.</p>;
  return (
    <div className="space-y-5">
      {grupos.map((g) => (
        <section key={g.chave}>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">{g.titulo}</h2>
          <ul className="space-y-2">
            {g.arquivos.map((a) => <CartaoArquivo key={a.id} arquivo={a} alunoId={alunoId} />)}
          </ul>
        </section>
      ))}
    </div>
  );
}
