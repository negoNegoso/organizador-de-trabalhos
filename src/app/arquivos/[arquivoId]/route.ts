import { NextResponse, type NextRequest } from 'next/server';
import { BUCKET, caminhoMiniatura } from '@/lib/dados/storage';
import { nomeDownload } from '@/lib/dominio/formato';
import { clienteServidor } from '@/lib/supabase/servidor';

export async function GET(request: NextRequest, { params }: { params: Promise<{ arquivoId: string }> }) {
  const { arquivoId } = await params;
  const sb = await clienteServidor();
  const { data: arquivo } = await sb
    .from('arquivos')
    .select('titulo,storage_path,tem_miniatura')
    .eq('id', arquivoId)
    .maybeSingle();
  if (!arquivo) return new NextResponse('Arquivo não encontrado', { status: 404 });

  const q = request.nextUrl.searchParams;
  const miniatura = q.has('miniatura');
  if (miniatura && !arquivo.tem_miniatura) return new NextResponse('Sem miniatura', { status: 404 });

  const caminho = miniatura ? caminhoMiniatura(arquivo.storage_path) : arquivo.storage_path;
  const { data, error } = await sb.storage
    .from(BUCKET)
    .createSignedUrl(caminho, 300, q.has('download') ? { download: nomeDownload(arquivo.titulo) } : undefined);
  if (error || !data) return new NextResponse('Falha ao gerar link', { status: 500 });
  return NextResponse.redirect(data.signedUrl);
}
