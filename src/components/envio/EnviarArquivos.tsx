'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { classificarArquivos } from '@/lib/envio/classificar';
import { ErroEnvio } from '@/lib/envio/erro';
import { itemDeImagens, itemDePdf } from '@/lib/envio/montar';
import { LIMITE_PDF } from '@/lib/pdf/validar';
import { enfileirar } from '@/lib/fila/useFila';
import { blobParaImagem } from '@/lib/imagem/navegador';
import type { Atividade } from '@/lib/tipos';
import { EscolherDestino } from './EscolherDestino';

type Props = {
  aluno: { id: string; nome: string };
  atividades: Atividade[];
  arquivosIniciais?: File[];
  voltarPara: string;
  aoEnfileirar?: () => Promise<void>;
};

export function EnviarArquivos({ aluno, atividades, arquivosIniciais = [], voltarPara, aoEnfileirar }: Props) {
  const router = useRouter();
  const [arquivos, setArquivos] = useState<File[]>(arquivosIniciais);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function enviar(d: { atividadeId: string | null; titulo: string }) {
    setErro(null);
    setOcupado(true);
    try {
      const c = classificarArquivos(arquivos);
      const destino = { alunoId: aluno.id, ...d };
      if (c.tipo === 'pdf' && c.arquivo.size > LIMITE_PDF) throw new ErroEnvio('PDF maior que 20 MB.');
      const item =
        c.tipo === 'pdf'
          ? await itemDePdf(new Uint8Array(await c.arquivo.arrayBuffer()), destino)
          : await itemDeImagens(c.arquivos.map((f) => () => blobParaImagem(f, 1600)), destino);
      await enfileirar(item);
      await aoEnfileirar?.();
      router.push(voltarPara);
      router.refresh();
    } catch (e) {
      setErro(e instanceof ErroEnvio ? e.message : 'Erro inesperado ao preparar o envio.');
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Enviar arquivo para {aluno.nome}</h1>
      <label className="block text-sm">
        Arquivos (1 PDF ou várias imagens)
        <input
          type="file"
          multiple
          accept="application/pdf,image/*,.heic,.heif"
          onChange={(e) => {
            setArquivos(Array.from(e.target.files ?? []));
            setErro(null);
          }}
          className="mt-1 block w-full"
        />
      </label>
      {arquivos.length > 0 && (
        <ul className="text-sm text-gray-700">{arquivos.map((f, i) => <li key={i}>{f.name}</li>)}</ul>
      )}
      {erro && <p role="alert" className="text-sm text-red-600">{erro}</p>}
      <EscolherDestino atividades={atividades} textoBotao="Enviar" ocupado={ocupado} onConfirmar={enviar} />
    </div>
  );
}
