import { ordenarCantos } from './cantos';
import type { Cantos, Ponto } from './tipos';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type OpenCV = any;

let carregando: Promise<{ cv: OpenCV } | null> | null = null;

/**
 * Carrega /opencv/opencv.js uma vez. Devolve `{ cv }` (embrulhado: o módulo do
 * OpenCV tem `.then` e confundiria o Promise) ou null se falhar/demorar.
 */
export function carregarOpenCV(src = '/opencv/opencv.js', timeoutMs = 20_000): Promise<{ cv: OpenCV } | null> {
  carregando ??= new Promise((resolve) => {
    const w = window as unknown as { cv?: OpenCV };
    const pronto = (m: OpenCV) => resolve(m?.Mat ? { cv: m } : null);
    const timer = setTimeout(() => resolve(null), timeoutMs);
    const aoCarregar = () => {
      clearTimeout(timer);
      const g = w.cv;
      if (!g) return resolve(null);
      if (g.Mat) return pronto(g);
      if (g instanceof Promise) return void g.then(pronto, () => resolve(null));
      g.onRuntimeInitialized = () => pronto(w.cv);
    };
    if (w.cv) return aoCarregar();
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = aoCarregar;
    script.onerror = () => {
      clearTimeout(timer);
      resolve(null);
    };
    document.head.appendChild(script);
  });
  return carregando;
}

/** Maior quadrilátero convexo com ≥ 20% da área do quadro, em coordenadas do canvas. */
export function detectarCantos(cv: OpenCV, canvas: HTMLCanvasElement): Cantos | null {
  const src = cv.imread(canvas);
  const cinza = new cv.Mat();
  const bordas = new cv.Mat();
  const nucleo = cv.Mat.ones(3, 3, cv.CV_8U);
  const contornos = new cv.MatVector();
  const hierarquia = new cv.Mat();
  try {
    cv.cvtColor(src, cinza, cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(cinza, cinza, new cv.Size(5, 5), 0);
    cv.Canny(cinza, bordas, 50, 150);
    cv.dilate(bordas, bordas, nucleo);
    cv.findContours(bordas, contornos, hierarquia, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

    const areaMinima = 0.2 * canvas.width * canvas.height;
    let melhor: Cantos | null = null;
    let melhorArea = 0;
    for (let i = 0; i < contornos.size(); i++) {
      const c = contornos.get(i);
      const area = cv.contourArea(c);
      if (area > areaMinima && area > melhorArea) {
        const aprox = new cv.Mat();
        cv.approxPolyDP(c, aprox, 0.02 * cv.arcLength(c, true), true);
        if (aprox.rows === 4 && cv.isContourConvex(aprox)) {
          const d = aprox.data32S as Int32Array;
          const pts: Ponto[] = [0, 1, 2, 3].map((k) => ({ x: d[k * 2], y: d[k * 2 + 1] }));
          melhor = ordenarCantos(pts);
          melhorArea = area;
        }
        aprox.delete();
      }
      c.delete();
    }
    return melhor;
  } finally {
    src.delete();
    cinza.delete();
    bordas.delete();
    nucleo.delete();
    contornos.delete();
    hierarquia.delete();
  }
}
