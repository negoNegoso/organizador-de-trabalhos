export const LIMITE_STORAGE = 1024 ** 3;
export const LIMIAR_AVISO = 0.8;

export function formatarBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  const unidades = ['KB', 'MB', 'GB'];
  let valor = n / 1024;
  let i = 0;
  while (valor >= 1024 && i < unidades.length - 1) {
    valor /= 1024;
    i++;
  }
  const casas = valor < 10 ? 1 : 0;
  return `${valor.toLocaleString('pt-BR', { maximumFractionDigits: casas })} ${unidades[i]}`;
}

export function usoAlto(bytes: number): boolean {
  return bytes / LIMITE_STORAGE >= LIMIAR_AVISO;
}

export function nomeDownload(titulo: string): string {
  const base = titulo.replace(/[\\/:*?"<>|]+/g, '-').trim() || 'trabalho';
  return `${base}.pdf`;
}

export function tituloPadrao(data: Date): string {
  return `Trabalho ${data.toLocaleDateString('pt-BR')}`;
}

export function formatarData(iso: string): string {
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}

export function hojeIso(d: Date = new Date()): string {
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}
