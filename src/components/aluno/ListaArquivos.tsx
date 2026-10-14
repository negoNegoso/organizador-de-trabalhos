'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { BotaoApagar } from '@/components/ui/BotaoApagar';
import { BuscarAluno } from '@/components/ui/BuscarAluno';
import { Renomear } from '@/components/ui/Renomear';
import { moverArquivo, renomearArquivo } from '@/lib/dados/arquivos';
import type { Grupo } from '@/lib/dominio/agrupar';
import { mensagemErro } from '@/lib/mensagemErro';
import { clienteNavegador } from '@/lib/supabase/navegador';
import type { Arquivo } from '@/lib/tipos';

function CartaoArquivo({ arquivo, alunoId }: { arquivo: Arquivo; alunoId: string }) {
  const router = useRouter();
  const [movendo, setMovendo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  return (
    <li data-testid="arquivo" className="rounded border bg-white p-3">
      <div className="flex gap-3">
        {arquivo.tem_miniatura ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/arquivos/${arquivo.id}?miniatura=1`} alt="" className="h-20 w-16 rounded border object-cover" />
        ) : (
          <div className="flex h-20 w-16 items-center justify-center rounded border text-xs text-gray-500">PDF</div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{arquivo.titulo}</p>
          <p className="text-xs text-gray-500">
            {new Date(arquivo.criado_em).toLocaleDateString('pt-BR')} · {arquivo.paginas} página(s)
          </p>
          <div className="mt-2 flex flex-wrap gap-3 text-sm">
            <a href={`/arquivos/${arquivo.id}`} target="_blank" rel="noreferrer" className="text-blue-700">Abrir</a>
            <a href={`/arquivos/${arquivo.id}?download=1`} className="text-blue-700">Baixar</a>
            <Renomear
              atual={arquivo.titulo}
              onSalvar={async (titulo) => {
                await renomearArquivo(clienteNavegador(), arquivo.id, titulo);
                router.refresh();
              }}
            />
            <button onClick={() => setMovendo((m) => !m)} className="text-blue-700">Mover</button>
            <BotaoApagar escopo={{ tipo: 'arquivo', id: arquivo.id }} rotulo="Apagar" descricao={`“${arquivo.titulo}”`} depois="refresh" />
          </div>
        </div>
      </div>
      {movendo && (
        <div className="mt-3">
          <BuscarAluno
            rotulo="Mover para qual aluno?"
            excluirId={alunoId}
            onEscolher={async (r) => {
              setErro(null);
              try {
                await moverArquivo(clienteNavegador(), arquivo, { id: r.id, turma_id: r.turma.id });
                setMovendo(false);
                router.refresh();
              } catch (e) {
                setErro(mensagemErro(e));
              }
            }}
          />
          {erro && <p role="alert" className="text-sm text-red-600">{erro}</p>}
        </div>
      )}
    </li>
  );
}

export function ListaArquivos({ grupos, alunoId }: { grupos: Grupo[]; alunoId: string }) {
  if (!grupos.length) return <p className="text-sm text-gray-600">Nenhum arquivo ainda.</p>;
  return (
    <div className="space-y-6">
      {grupos.map((g) => (
        <section key={g.chave}>
          <h2 className="mb-2 font-medium">{g.titulo}</h2>
          <ul className="space-y-2">
            {g.arquivos.map((a) => <CartaoArquivo key={a.id} arquivo={a} alunoId={alunoId} />)}
          </ul>
        </section>
      ))}
    </div>
  );
}
