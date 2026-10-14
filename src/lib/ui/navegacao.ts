export type Aba = 'inicio' | 'turmas' | 'buscar' | 'mais';

export type Acao = { tipo: 'ir'; href: string } | { tipo: 'lote-turma'; turmaId: string } | { tipo: 'menu' };

export function abaAtiva(pathname: string): Aba | null {
  if (pathname === '/') return 'inicio';
  if (/^\/(turmas|anos|alunos)(\/|$)/.test(pathname)) return 'turmas';
  if (pathname.startsWith('/buscar')) return 'buscar';
  if (pathname.startsWith('/mais')) return 'mais';
  return null;
}

export function barraVisivel(pathname: string): boolean {
  return !/^\/alunos\/[^/]+\/escanear\/?$/.test(pathname) && !/^\/lote\/[^/]+\/?$/.test(pathname);
}

export function acaoDoBotao(pathname: string): Acao {
  const aluno = pathname.match(/^\/alunos\/([^/]+)(\/enviar)?\/?$/);
  if (aluno) return { tipo: 'ir', href: `/alunos/${aluno[1]}/escanear` };
  const turma = pathname.match(/^\/turmas\/([^/]+)\/?$/);
  if (turma) return { tipo: 'lote-turma', turmaId: turma[1] };
  return { tipo: 'menu' };
}
