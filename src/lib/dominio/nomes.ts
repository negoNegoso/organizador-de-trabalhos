import { normalizar } from './busca';

export function limparNome(nome: string): string {
  return nome.trim().replace(/\s+/g, ' ');
}

export function parseNomes(texto: string, existentes: string[] = []): { novos: string[]; ignorados: number } {
  const vistos = new Set(existentes.map(normalizar));
  const novos: string[] = [];
  let ignorados = 0;
  for (const linha of texto.split(/\r?\n/)) {
    const nome = limparNome(linha);
    if (!nome) continue;
    const chave = normalizar(nome);
    if (vistos.has(chave)) {
      ignorados++;
      continue;
    }
    vistos.add(chave);
    novos.push(nome);
  }
  return { novos, ignorados };
}
