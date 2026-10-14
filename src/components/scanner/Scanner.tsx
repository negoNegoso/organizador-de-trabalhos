'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { EscolherDestino } from '@/components/envio/EscolherDestino';
import { idsEntregues } from '@/lib/dominio/entregas';
import { itemDeImagens } from '@/lib/envio/montar';
import type { Destino } from '@/lib/fila/fila';
import { enfileirar, useFila } from '@/lib/fila/useFila';
import { processarPagina } from '@/lib/imagem/navegador';
import type { Filtro, Pagina } from '@/lib/imagem/tipos';
import type { Aluno, Atividade } from '@/lib/tipos';
import { Camera } from './Camera';
import { Revisao } from './Revisao';
import { SeletorAluno } from './SeletorAluno';

type Props =
  | { modo: 'avulso'; aluno: Aluno; atividades: Atividade[] }
  | { modo: 'lote'; atividade: Atividade; alunos: Aluno[]; entreguesNoBanco: string[] };

type Etapa = 'camera' | 'revisao' | 'destino';

export function Scanner(props: Props) {
  const router = useRouter();
  const { itens } = useFila();
  const [etapa, setEtapa] = useState<Etapa>('camera');
  const [paginas, setPaginas] = useState<Pagina[]>([]);
  const [filtro, setFiltro] = useState<Filtro>('documento');
  const [erroCamera, setErroCamera] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvosNoLote, setSalvosNoLote] = useState<string[]>([]);

  const capturar = useCallback((p: Pagina) => {
    setPaginas((ps) => [...ps, p]);
    setAviso(null);
  }, []);
  const aoErroCamera = useCallback((m: string) => setErroCamera(m), []);

  async function salvar(destino: Destino, nome: string) {
    setOcupado(true);
    setErro(null);
    try {
      const item = await itemDeImagens(paginas.map((p) => () => processarPagina(p, filtro, 1600)), destino);
      await enfileirar(item);
      setPaginas([]);
      setAviso(`Salvo para ${nome}. Enviando…`);
      if (props.modo === 'avulso') {
        router.push(`/alunos/${props.aluno.id}`);
        router.refresh();
      } else {
        setSalvosNoLote((s) => [...s, destino.alunoId]);
        setEtapa('camera');
      }
    } catch {
      setErro('Não consegui gerar o PDF. Confira os cantos das páginas e tente de novo.');
    } finally {
      setOcupado(false);
    }
  }

  const voltar = props.modo === 'avulso' ? `/alunos/${props.aluno.id}` : '/lote';
  const titulo = props.modo === 'avulso' ? props.aluno.nome : props.atividade.nome;
  const entregues =
    props.modo === 'lote'
      ? new Set([...idsEntregues(props.entreguesNoBanco, itens, props.atividade.id), ...salvosNoLote])
      : new Set<string>();

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-black text-white">
      <header className="flex items-center justify-between gap-2 p-3">
        <Link href={voltar} className="text-sm">Fechar</Link>
        <span className="truncate font-medium">{titulo}</span>
        <span className="text-sm">{paginas.length} pág.</span>
      </header>
      {aviso && <p role="status" className="bg-green-700 px-3 py-2 text-sm">{aviso}</p>}
      {erro && <p role="alert" className="bg-red-700 px-3 py-2 text-sm">{erro}</p>}
      <div className="relative min-h-0 flex-1">
        {etapa === 'camera' &&
          (erroCamera ? (
            <div className="space-y-3 p-4">
              <p>{erroCamera}</p>
              {props.modo === 'avulso' && (
                <Link href={`/alunos/${props.aluno.id}/enviar`} className="underline">Enviar arquivo em vez disso</Link>
              )}
            </div>
          ) : (
            <>
              <Camera onCapturar={capturar} onErro={aoErroCamera} />
              {paginas.length > 0 && (
                <button onClick={() => setEtapa('revisao')} className="absolute right-3 top-14 rounded bg-blue-600 px-3 py-2 text-sm">
                  Revisar ({paginas.length})
                </button>
              )}
            </>
          ))}
        {etapa === 'revisao' && (
          <Revisao
            paginas={paginas}
            filtro={filtro}
            onFiltro={setFiltro}
            onAlterar={setPaginas}
            onMaisPaginas={() => setEtapa('camera')}
            onContinuar={() => setEtapa('destino')}
          />
        )}
        {etapa === 'destino' && (
          <div className="h-full overflow-y-auto bg-white p-4 text-gray-900">
            <button onClick={() => setEtapa('revisao')} className="mb-3 text-sm text-blue-700">← Voltar para as páginas</button>
            {props.modo === 'avulso' ? (
              <EscolherDestino
                atividades={props.atividades}
                textoBotao="Salvar"
                ocupado={ocupado}
                onConfirmar={(d) => salvar({ alunoId: props.aluno.id, ...d }, props.aluno.nome)}
              />
            ) : (
              <SeletorAluno
                alunos={props.alunos}
                entregues={entregues}
                ocupado={ocupado}
                onEscolher={(a) =>
                  salvar({ alunoId: a.id, atividadeId: props.atividade.id, titulo: props.atividade.nome }, a.nome)
                }
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
