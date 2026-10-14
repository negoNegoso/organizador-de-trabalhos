'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { cantosDaImagem, escalarCantos } from '@/lib/imagem/cantos';
import { Estabilizador } from '@/lib/imagem/estabilizador';
import { carregarOpenCV, detectarCantos, type OpenCV } from '@/lib/imagem/opencv';
import { liberarCanvas } from '@/lib/imagem/navegador';
import type { Cantos, Pagina } from '@/lib/imagem/tipos';

const LARGURA_DETECCAO = 480;
const MAX_FONTE = 2400;

type Props = { onCapturar: (p: Pagina) => void; onErro: (mensagem: string) => void };

function desenharContorno(canvas: HTMLCanvasElement | null, w: number, h: number, cantos: Cantos | null) {
  if (!canvas) return;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, w, h);
  if (!cantos) return;
  ctx.beginPath();
  cantos.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.fillStyle = 'rgba(34,197,94,0.2)';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#22c55e';
  ctx.stroke();
}

export function Camera({ onCapturar, onErro }: Props) {
  const video = useRef<HTMLVideoElement>(null);
  const overlay = useRef<HTMLCanvasElement>(null);
  const ultimos = useRef<Cantos | null>(null);
  const capturando = useRef(false);
  const autoRef = useRef(false);
  const [cv, setCv] = useState<OpenCV | null>(null);
  const [statusCv, setStatusCv] = useState<'carregando' | 'ok' | 'falhou'>('carregando');
  const [auto, setAuto] = useState(false);
  const [detectado, setDetectado] = useState(false);

  useEffect(() => {
    autoRef.current = auto;
  }, [auto]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelado = false;
    if (!navigator.mediaDevices?.getUserMedia) {
      onErro('Este navegador não dá acesso à câmera.');
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment', width: { ideal: 3840 }, height: { ideal: 2160 } }, audio: false })
      .then((s) => {
        if (cancelado) return s.getTracks().forEach((t) => t.stop());
        stream = s;
        if (video.current) {
          video.current.srcObject = s;
          void video.current.play();
        }
      })
      .catch(() =>
        onErro('Não consegui abrir a câmera. Libere a permissão de câmera para este site nas configurações do navegador.'),
      );
    return () => {
      cancelado = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onErro]);

  useEffect(() => {
    let vivo = true;
    void carregarOpenCV().then((r) => {
      if (!vivo) return;
      if (r) {
        setCv(r.cv);
        setStatusCv('ok');
      } else setStatusCv('falhou');
    });
    return () => {
      vivo = false;
    };
  }, []);

  const capturar = useCallback(async () => {
    const v = video.current;
    if (!v?.videoWidth || capturando.current) return;
    capturando.current = true;
    let canvas: HTMLCanvasElement | null = null;
    try {
      const escala = Math.min(1, MAX_FONTE / Math.max(v.videoWidth, v.videoHeight));
      const w = Math.round(v.videoWidth * escala);
      const h = Math.round(v.videoHeight * escala);
      const c = (canvas = document.createElement('canvas'));
      c.width = w;
      c.height = h;
      c.getContext('2d')!.drawImage(v, 0, 0, w, h);
      const fonte = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/jpeg', 0.9));
      if (!fonte) return;
      const det = ultimos.current;
      onCapturar({
        id: crypto.randomUUID(),
        fonte,
        largura: w,
        altura: h,
        cantos: det ? escalarCantos(det, w / LARGURA_DETECCAO) : cantosDaImagem({ width: w, height: h }),
        rotacao: 0,
        detectado: !!det,
      });
    } finally {
      liberarCanvas(canvas);
      capturando.current = false;
    }
  }, [onCapturar]);

  useEffect(() => {
    const v = video.current;
    if (!cv || !v) return;
    const det = document.createElement('canvas');
    const estabilizador = new Estabilizador(LARGURA_DETECCAO * 0.02, 1000);
    const id = window.setInterval(() => {
      if (!v.videoWidth) return;
      det.width = LARGURA_DETECCAO;
      det.height = Math.round((LARGURA_DETECCAO * v.videoHeight) / v.videoWidth);
      det.getContext('2d', { willReadFrequently: true })!.drawImage(v, 0, 0, det.width, det.height);
      let cantos: Cantos | null = null;
      try {
        cantos = detectarCantos(cv, det);
      } catch {
        cantos = null;
      }
      ultimos.current = cantos;
      setDetectado(!!cantos);
      desenharContorno(overlay.current, det.width, det.height, cantos);
      if (autoRef.current && estabilizador.atualizar(cantos, performance.now())) {
        estabilizador.reiniciar();
        void capturar();
      }
    }, 200);
    return () => {
      window.clearInterval(id);
      liberarCanvas(det);
    };
  }, [cv, capturar]);

  return (
    <div className="relative h-full w-full bg-black">
      <video ref={video} playsInline muted className="absolute inset-0 h-full w-full object-contain" />
      <canvas
        ref={overlay}
        aria-hidden
        data-detectado={detectado ? 'sim' : 'nao'}
        className="pointer-events-none absolute inset-0 h-full w-full object-contain"
      />
      {statusCv === 'carregando' && (
        <p className="absolute inset-x-2 top-2 rounded bg-black/60 p-2 text-sm">Carregando detecção…</p>
      )}
      {statusCv === 'falhou' && (
        <p className="absolute inset-x-2 top-2 rounded bg-yellow-100 p-2 text-sm text-gray-900">
          Detecção automática indisponível. Ajuste os cantos depois da foto.
        </p>
      )}
      <div className="absolute inset-x-0 bottom-6 flex items-center justify-center gap-8">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} /> Auto
        </label>
        <button onClick={capturar} aria-label="Capturar" className="h-16 w-16 rounded-full border-4 border-white bg-white/30" />
      </div>
    </div>
  );
}
