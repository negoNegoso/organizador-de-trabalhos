# Navegação e UI — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar a navegação em cadeia por uma barra de abas inferior com botão 📷 contextual, cabeçalhos com caminho e menu ⋯, turmas coloridas e o estilo visual "vibrante".

**Architecture:** Regras puras de navegação/cor/ano em `src/lib/ui/` (testadas em Node). Um kit de componentes em `src/components/ui/` construído sobre um `MenuInferior` baseado em `<dialog>`. O layout `(app)` ganha `BarraAbas` fixa embaixo; as páginas existentes trocam links/botões soltos por `Cabecalho` + `MenuAcoes`. Dados: uma coluna `turmas.cor` e três consultas novas.

**Tech Stack:** Next.js 16.4 (App Router), React 19, TypeScript, Tailwind v4, Supabase, `lucide-react` (nova), Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-14-navegacao-ui-design.md` (base: `docs/superpowers/specs/2026-10-14-organizador-trabalhos-design.md`)

## Global Constraints

- Interface em português do Brasil. App sempre claro (`color-scheme: light`), sem modo escuro.
- Única dependência nova: `lucide-react`. Ícones decorativos com `aria-hidden`.
- Paleta fixa de 8 cores de turma, nesta ordem: `azul`, `verde`, `laranja`, `roxo`, `rosa`, `ciano`, `ambar`, `vermelho`.
- Destaque azul `blue-600`; fundo `slate-50`; superfícies brancas com borda `slate-200`; cantos `rounded-xl`.
- Alvos de toque ≥ 44 px. Barra de abas respeita `env(safe-area-inset-bottom)`.
- Barra de abas oculta em `/login`, `/alunos/[id]/escanear` e `/lote/[atividadeId]`.
- Cookie do ano selecionado: nome `ano_id`, `path=/`, `max-age=31536000`, `samesite=lax`.
- Scanner, fila de envio, RLS e regras de negócio existentes não mudam.
- Comandos: `npx` não funciona neste ambiente → use `npm exec -- <cmd>`. Supabase local nas portas 544xx (já rodando).
- E2E: nunca `page.getByRole('alert')` sem escopo (o route announcer do Next também é `alert`).
- Commits terminam com `Co-Authored-By: Claude <modelo> 5.5 <noreply@anthropic.com>` nomeando o modelo que escreveu.

## Review Focus

1. **Cookie `ano_id` aponta para um ano apagado** → Início usa o ano ativo, sem erro → teste unitário em Task 1 (`escolherAno`).
2. **📷 numa turma sem atividades ou sem alunos** → menu abre direto no "criar atividade" / mostra "Adicione alunos primeiro" → E2E em Task 5.
3. **Nome de turma/aluno muito longo** → cartões e cabeçalhos truncam, sem rolagem horizontal da página → E2E em Task 4.
4. **Fechar menus com Esc / botão voltar do Android** (evento `cancel` do `<dialog>`) → E2E em Task 3.
5. **SO em modo escuro** → componentes novos (cartões coloridos, barra de abas) continuam legíveis → E2E `modo-escuro.spec.ts` atualizado em Task 4.

## Estrutura de arquivos

```
src/lib/ui/
  cores.ts            paleta, ESTILO_COR, ehCor, sugerirCor
  ano.ts              COOKIE_ANO, escolherAno
  navegacao.ts        Aba, abaAtiva, barraVisivel, Acao, acaoDoBotao
src/components/ui/
  MenuInferior.tsx    <dialog> que sobe de baixo (Esc, toque fora, arrastar)
  MenuAcoes.tsx       botão ⋯ + lista de ações
  Cabecalho.tsx       voltar, título, subtítulo, ações, cor, abas internas
  CartaoTurma.tsx     cartão colorido
  ItemLista.tsx       linha tocável com chevron
  BarraProgresso.tsx  entregues/total
  EtiquetaTurma.tsx   etiqueta com cor suave
  SeletorCor.tsx      8 cores (radiogroup)
  PainelNome.tsx      MenuInferior + FormNome (renomear/criar)
  ConfirmarApagar.tsx conta arquivos e confirma apagar
  Confirmar.tsx       (reescrito sobre MenuInferior; props iguais)
  BuscarAluno.tsx     (ganha autoFocus e ponto de cor)
src/components/navegacao/
  BarraAbas.tsx, BotaoEscanear.tsx, MenuEscanear.tsx, MenuLoteTurma.tsx
src/components/inicio/   SeletorAno.tsx, GradeTurmas.tsx, Recentes.tsx (+ NovoAno, UsoStorage reestilizados)
src/components/turma/    NovaTurma.tsx (movido de ano/), AcoesTurma, AbaAlunos, AdicionarAlunos, AbaAtividades
src/components/aluno/    AcoesAluno, ListaArquivos
src/components/ano/      AcoesAno
src/app/(app)/           layout, page (Início), turmas/page, buscar/page, mais/page, + páginas existentes
supabase/migrations/20261015000000_cor_turma.sql
```

Removidos ao final: `src/components/ui/Renomear.tsx`, `src/components/ui/BotaoApagar.tsx`, `src/components/ano/NovaTurma.tsx`.

---

### Task 1: Regras puras de UI (cor, ano, navegação) e `lucide-react`

**Files:**
- Create: `src/lib/ui/cores.ts`, `src/lib/ui/ano.ts`, `src/lib/ui/navegacao.ts`
- Test: `src/lib/ui/cores.test.ts`, `src/lib/ui/ano.test.ts`, `src/lib/ui/navegacao.test.ts`
- Modify: `package.json` (dependência `lucide-react`)

**Interfaces:**
- Consumes: `AnoLetivo` de `src/lib/tipos.ts`.
- Produces:
  - `CORES: readonly CorTurma[]`; `type CorTurma = 'azul'|'verde'|'laranja'|'roxo'|'rosa'|'ciano'|'ambar'|'vermelho'`; `ESTILO_COR: Record<CorTurma, { nome: string; forte: string; suave: string; texto: string; ponto: string }>`; `ehCor(v: string): v is CorTurma`; `sugerirCor(usadas: CorTurma[]): CorTurma`
  - `COOKIE_ANO = 'ano_id'`; `escolherAno(anos: AnoLetivo[], cookieId: string | undefined): AnoLetivo | null`
  - `type Aba = 'inicio' | 'turmas' | 'buscar' | 'mais'`; `abaAtiva(pathname: string): Aba | null`; `barraVisivel(pathname: string): boolean`; `type Acao = { tipo: 'ir'; href: string } | { tipo: 'lote-turma'; turmaId: string } | { tipo: 'menu' }`; `acaoDoBotao(pathname: string): Acao`

- [ ] **Step 1: Instalar ícones**

```bash
npm i lucide-react
```

- [ ] **Step 2: Escrever os testes (falhando)**

`src/lib/ui/cores.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { CORES, ESTILO_COR, ehCor, sugerirCor } from './cores';

describe('paleta', () => {
  it('tem 8 cores na ordem da spec, todas com estilo', () => {
    expect(CORES).toEqual(['azul', 'verde', 'laranja', 'roxo', 'rosa', 'ciano', 'ambar', 'vermelho']);
    for (const c of CORES) expect(ESTILO_COR[c].forte).toMatch(/^bg-/);
  });
  it('ehCor reconhece só cores da paleta', () => {
    expect(ehCor('roxo')).toBe(true);
    expect(ehCor('preto')).toBe(false);
  });
});

describe('sugerirCor', () => {
  it('sem turmas sugere a primeira', () => {
    expect(sugerirCor([])).toBe('azul');
  });
  it('sugere a primeira ainda não usada', () => {
    expect(sugerirCor(['azul', 'verde', 'roxo'])).toBe('laranja');
  });
  it('com todas usadas, sugere a menos usada (empate pela ordem da paleta)', () => {
    expect(sugerirCor([...CORES, 'azul', 'laranja'])).toBe('verde');
  });
});
```

`src/lib/ui/ano.test.ts`:

```ts
import { expect, it } from 'vitest';
import type { AnoLetivo } from '../tipos';
import { escolherAno } from './ano';

const a2025: AnoLetivo = { id: 'a25', ano: 2025, arquivado: false };
const a2026: AnoLetivo = { id: 'a26', ano: 2026, arquivado: false };
const a2027arq: AnoLetivo = { id: 'a27', ano: 2027, arquivado: true };

it('usa o ano do cookie quando existe', () => {
  expect(escolherAno([a2026, a2025], 'a25')).toBe(a2025);
});

it('cookie de ano apagado cai no mais recente não arquivado', () => {
  expect(escolherAno([a2027arq, a2026, a2025], 'sumiu')).toBe(a2026);
});

it('sem cookie usa o mais recente não arquivado, mesmo fora de ordem', () => {
  expect(escolherAno([a2025, a2026], undefined)).toBe(a2026);
});

it('todos arquivados usa o mais recente', () => {
  const v: AnoLetivo = { id: 'v', ano: 2020, arquivado: true };
  expect(escolherAno([v, a2027arq], undefined)).toBe(a2027arq);
});

it('sem anos devolve null', () => {
  expect(escolherAno([], 'x')).toBeNull();
});
```

`src/lib/ui/navegacao.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { abaAtiva, acaoDoBotao, barraVisivel } from './navegacao';

describe('abaAtiva', () => {
  it.each([
    ['/', 'inicio'],
    ['/turmas', 'turmas'],
    ['/turmas/t1', 'turmas'],
    ['/anos/a1', 'turmas'],
    ['/alunos/al1', 'turmas'],
    ['/alunos/al1/enviar', 'turmas'],
    ['/buscar', 'buscar'],
    ['/mais', 'mais'],
    ['/lote', null],
    ['/compartilhar', null],
  ])('%s → %s', (rota, aba) => {
    expect(abaAtiva(rota)).toBe(aba);
  });
});

describe('barraVisivel', () => {
  it('some no scanner em tela cheia', () => {
    expect(barraVisivel('/alunos/al1/escanear')).toBe(false);
    expect(barraVisivel('/lote/at1')).toBe(false);
  });
  it('aparece nas demais', () => {
    for (const r of ['/', '/lote', '/turmas/t1', '/alunos/al1', '/alunos/al1/enviar', '/mais']) {
      expect(barraVisivel(r)).toBe(true);
    }
  });
});

describe('acaoDoBotao', () => {
  it('na pasta do aluno (ou no envio dele) abre a câmera dele', () => {
    expect(acaoDoBotao('/alunos/al1')).toEqual({ tipo: 'ir', href: '/alunos/al1/escanear' });
    expect(acaoDoBotao('/alunos/al1/enviar')).toEqual({ tipo: 'ir', href: '/alunos/al1/escanear' });
  });
  it('na turma abre o lote da turma', () => {
    expect(acaoDoBotao('/turmas/t1')).toEqual({ tipo: 'lote-turma', turmaId: 't1' });
  });
  it.each(['/', '/turmas', '/buscar', '/mais', '/anos/a1', '/lote', '/compartilhar'])('em %s abre o menu', (rota) => {
    expect(acaoDoBotao(rota)).toEqual({ tipo: 'menu' });
  });
});
```

Run: `npm test -- src/lib/ui` → Expected: FAIL (módulos inexistentes).

- [ ] **Step 3: Implementar**

`src/lib/ui/cores.ts`:

```ts
export const CORES = ['azul', 'verde', 'laranja', 'roxo', 'rosa', 'ciano', 'ambar', 'vermelho'] as const;
export type CorTurma = (typeof CORES)[number];

type Estilo = { nome: string; forte: string; suave: string; texto: string; ponto: string };

// Classes completas (o Tailwind só gera classes que aparecem literais no código).
export const ESTILO_COR: Record<CorTurma, Estilo> = {
  azul: { nome: 'Azul', forte: 'bg-blue-600', suave: 'bg-blue-100', texto: 'text-blue-800', ponto: 'bg-blue-500' },
  verde: { nome: 'Verde', forte: 'bg-green-600', suave: 'bg-green-100', texto: 'text-green-800', ponto: 'bg-green-500' },
  laranja: { nome: 'Laranja', forte: 'bg-orange-600', suave: 'bg-orange-100', texto: 'text-orange-800', ponto: 'bg-orange-500' },
  roxo: { nome: 'Roxo', forte: 'bg-purple-600', suave: 'bg-purple-100', texto: 'text-purple-800', ponto: 'bg-purple-500' },
  rosa: { nome: 'Rosa', forte: 'bg-pink-600', suave: 'bg-pink-100', texto: 'text-pink-800', ponto: 'bg-pink-500' },
  ciano: { nome: 'Ciano', forte: 'bg-cyan-700', suave: 'bg-cyan-100', texto: 'text-cyan-800', ponto: 'bg-cyan-500' },
  ambar: { nome: 'Âmbar', forte: 'bg-amber-600', suave: 'bg-amber-100', texto: 'text-amber-900', ponto: 'bg-amber-500' },
  vermelho: { nome: 'Vermelho', forte: 'bg-red-600', suave: 'bg-red-100', texto: 'text-red-800', ponto: 'bg-red-500' },
};

export function ehCor(v: string): v is CorTurma {
  return (CORES as readonly string[]).includes(v);
}

/** Primeira cor menos usada no ano (empate → ordem da paleta). */
export function sugerirCor(usadas: CorTurma[]): CorTurma {
  const contagem = new Map<CorTurma, number>(CORES.map((c) => [c, 0]));
  for (const c of usadas) contagem.set(c, (contagem.get(c) ?? 0) + 1);
  let melhor: CorTurma = CORES[0];
  for (const c of CORES) if (contagem.get(c)! < contagem.get(melhor)!) melhor = c;
  return melhor;
}
```

`src/lib/ui/ano.ts`:

```ts
import type { AnoLetivo } from '../tipos';

export const COOKIE_ANO = 'ano_id';

/** Cookie válido → esse ano; senão o mais recente não arquivado; senão o mais recente. */
export function escolherAno(anos: AnoLetivo[], cookieId: string | undefined): AnoLetivo | null {
  if (!anos.length) return null;
  const doCookie = cookieId ? anos.find((a) => a.id === cookieId) : undefined;
  if (doCookie) return doCookie;
  const ordenados = [...anos].sort((a, b) => b.ano - a.ano);
  return ordenados.find((a) => !a.arquivado) ?? ordenados[0];
}
```

`src/lib/ui/navegacao.ts`:

```ts
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
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test -- src/lib/ui && npm exec -- tsc --noEmit`
Expected: todos PASS; tsc limpo.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/lib/ui
git commit -m "feat(ui): regras de cor, ano selecionado e navegação contextual"
```

---

### Task 2: Cor da turma no banco e consultas novas

**Files:**
- Create: `supabase/migrations/20261015000000_cor_turma.sql`
- Modify: `src/lib/tipos.ts`, `src/lib/dados/turmas.ts`, `src/lib/dados/arquivos.ts`, `src/lib/dados/alunos.ts` (buscarAlunos devolve cor)
- Test: `tests/integration/dados.test.ts` (novos `describe` + ajuste do teste de busca)

**Interfaces:**
- Consumes: `CorTurma` (Task 1).
- Produces:
  - Tipos: `Turma` ganha `cor: CorTurma`; `type TurmaComContagem = Turma & { total_alunos: number }`; `type TurmaComAno = TurmaComContagem & { ano: AnoLetivo }`; `ResultadoBusca.turma` ganha `cor: CorTurma`; `type Recente = { id: string; titulo: string; criado_em: string; aluno: { id: string; nome: string }; turma: { nome: string; cor: CorTurma } }`.
  - `criarTurma(sb, anoId, nome, cor?: CorTurma): Promise<Turma>`; `definirCorTurma(sb, id, cor: CorTurma): Promise<void>`; `listarTurmasComContagem(sb, anoId): Promise<TurmaComContagem[]>`; `listarTurmasPorAno(sb): Promise<TurmaComAno[]>`; `listarRecentes(sb, limite = 5): Promise<Recente[]>`.

- [ ] **Step 1: Escrever os testes de integração (falhando)**

Em `tests/integration/dados.test.ts`:
1. Troque a importação de turmas por: `import { criarTurma, definirCorTurma, listarTurmas, listarTurmasComContagem, listarTurmasPorAno } from '@/lib/dados/turmas';`
2. Acrescente `listarRecentes` à importação de `@/lib/dados/arquivos`.
3. No teste `'busca ignora acento e maiúscula'`, a expectativa passa a ser:

```ts
    expect(await buscarAlunos(sb, 'JOAO')).toEqual([
      { id: s.alunos.joao, nome: 'João Pedro', turma: { id: s.turmaId, nome: '3º A', cor: 'azul' }, ano: 2026 },
    ]);
```

4. Acrescente ao fim do arquivo:

```ts
describe('turmas: cor e contagem', () => {
  it('turma nova usa azul por padrão e aceita cor escolhida', async () => {
    const s = await semear(sb);
    const b = await criarTurma(sb, s.anoId, '3º B', 'roxo');
    expect(b.cor).toBe('roxo');
    const [a] = (await listarTurmas(sb, s.anoId)).filter((t) => t.nome === '3º A');
    expect(a.cor).toBe('azul');
  });

  it('banco recusa cor fora da paleta', async () => {
    const s = await semear(sb);
    const { error } = await sb.from('turmas').insert({ ano_letivo_id: s.anoId, nome: 'X', cor: 'preto' });
    expect(error?.code).toBe('23514');
  });

  it('muda a cor', async () => {
    const s = await semear(sb);
    await definirCorTurma(sb, s.turmaId, 'verde');
    expect((await listarTurmas(sb, s.anoId))[0].cor).toBe('verde');
  });

  it('lista turmas do ano com número de alunos', async () => {
    const s = await semear(sb);
    await criarTurma(sb, s.anoId, '3º B', 'laranja');
    expect((await listarTurmasComContagem(sb, s.anoId)).map((t) => [t.nome, t.cor, t.total_alunos])).toEqual([
      ['3º A', 'azul', 2],
      ['3º B', 'laranja', 0],
    ]);
  });

  it('lista todas as turmas com o ano', async () => {
    const s = await semear(sb);
    const outroAno = await criarAno(sb, 2025);
    await criarTurma(sb, outroAno.id, '2º C', 'rosa');
    const todas = await listarTurmasPorAno(sb);
    expect(todas.map((t) => [t.ano.ano, t.nome, t.total_alunos])).toEqual([
      [2026, '3º A', 2],
      [2025, '2º C', 0],
    ]);
    expect(todas[0].ano).toMatchObject({ id: s.anoId, arquivado: false });
  });
});

describe('recentes', () => {
  it('lista os mais recentes primeiro, com aluno e turma, respeitando o limite', async () => {
    const s = await semear(sb);
    await criarArquivo(sb, s.alunos.maria, null, 'Primeiro');
    await criarArquivo(sb, s.alunos.joao, null, 'Segundo');
    await criarArquivo(sb, s.alunos.maria, null, 'Terceiro');
    const r = await listarRecentes(sb, 2);
    expect(r.map((x) => x.titulo)).toEqual(['Terceiro', 'Segundo']);
    expect(r[1]).toMatchObject({ aluno: { id: s.alunos.joao, nome: 'João Pedro' }, turma: { nome: '3º A', cor: 'azul' } });
  });

  it('sem arquivos devolve lista vazia', async () => {
    expect(await listarRecentes(sb)).toEqual([]);
  });
});
```

(`criarAno` já está importado de `@/lib/dados/anos` no topo do arquivo; confira.)

Run: `npm run test:int` → Expected: FAIL (funções inexistentes / coluna `cor` inexistente).

- [ ] **Step 2: Migração**

`supabase/migrations/20261015000000_cor_turma.sql`:

```sql
alter table public.turmas
  add column cor text not null default 'azul'
  check (cor in ('azul', 'verde', 'laranja', 'roxo', 'rosa', 'ciano', 'ambar', 'vermelho'));

-- Turmas existentes: cor pela ordem de criação dentro de cada ano, ciclando a paleta.
with ordenadas as (
  select id, (row_number() over (partition by ano_letivo_id order by criado_em, id) - 1) % 8 as i
  from public.turmas
)
update public.turmas t
set cor = (array['azul', 'verde', 'laranja', 'roxo', 'rosa', 'ciano', 'ambar', 'vermelho'])[o.i + 1]
from ordenadas o
where o.id = t.id;
```

Run: `npm exec -- supabase migration up && npm run test:db`
Expected: migração aplicada; pgTAP segue 14/14.

- [ ] **Step 3: Tipos**

Em `src/lib/tipos.ts`, adicione no topo `import type { CorTurma } from './ui/cores';` e:
- troque `Turma` por `export type Turma = { id: string; ano_letivo_id: string; nome: string; cor: CorTurma };`
- acrescente:

```ts
export type TurmaComContagem = Turma & { total_alunos: number };
export type TurmaComAno = TurmaComContagem & { ano: AnoLetivo };
export type Recente = {
  id: string;
  titulo: string;
  criado_em: string;
  aluno: { id: string; nome: string };
  turma: { nome: string; cor: CorTurma };
};
```

- troque `ResultadoBusca` por `export type ResultadoBusca = { id: string; nome: string; turma: { id: string; nome: string; cor: CorTurma }; ano: number };`

- [ ] **Step 4: Consultas**

`src/lib/dados/turmas.ts` (substitui o arquivo):

```ts
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AnoLetivo, Turma, TurmaComAno, TurmaComContagem, TurmaDetalhe } from '../tipos';
import type { CorTurma } from '../ui/cores';
import { checar, type Resposta } from './consulta';

const CAMPOS = 'id,ano_letivo_id,nome,cor';

type ComContagem = Turma & { alunos: { count: number }[] };
const contar = ({ alunos, ...t }: ComContagem): TurmaComContagem => ({ ...t, total_alunos: alunos[0]?.count ?? 0 });

export async function listarTurmas(sb: SupabaseClient, anoId: string): Promise<Turma[]> {
  return checar(await sb.from('turmas').select(CAMPOS).eq('ano_letivo_id', anoId).order('nome'));
}

export async function listarTurmasComContagem(sb: SupabaseClient, anoId: string): Promise<TurmaComContagem[]> {
  const linhas = checar<ComContagem[]>(
    await sb.from('turmas').select(`${CAMPOS},alunos(count)`).eq('ano_letivo_id', anoId).order('nome'),
  );
  return linhas.map(contar);
}

/** Todas as turmas, do ano mais recente para o mais antigo e por nome dentro do ano. */
export async function listarTurmasPorAno(sb: SupabaseClient): Promise<TurmaComAno[]> {
  type Linha = ComContagem & { anos_letivos: AnoLetivo };
  const resposta = await sb.from('turmas').select(`${CAMPOS},alunos(count),anos_letivos(id,ano,arquivado)`);
  // Sem tipos gerados, o supabase-js infere relações como arrays; aqui é to-one.
  const linhas = checar(resposta as unknown as Resposta<Linha[]>);
  return linhas
    .map(({ anos_letivos, ...t }) => ({ ...contar(t), ano: anos_letivos }))
    .sort((a, b) => b.ano.ano - a.ano.ano || a.nome.localeCompare(b.nome, 'pt-BR'));
}

export async function obterTurma(sb: SupabaseClient, id: string): Promise<TurmaDetalhe> {
  return checar(await sb.from('turmas').select(`${CAMPOS},anos_letivos(ano)`).eq('id', id).single());
}

export async function criarTurma(sb: SupabaseClient, anoId: string, nome: string, cor?: CorTurma): Promise<Turma> {
  const valores = cor ? { ano_letivo_id: anoId, nome, cor } : { ano_letivo_id: anoId, nome };
  return checar(await sb.from('turmas').insert(valores).select(CAMPOS).single());
}

export async function renomearTurma(sb: SupabaseClient, id: string, nome: string): Promise<void> {
  checar(await sb.from('turmas').update({ nome }).eq('id', id));
}

export async function definirCorTurma(sb: SupabaseClient, id: string, cor: CorTurma): Promise<void> {
  checar(await sb.from('turmas').update({ cor }).eq('id', id));
}
```

Em `src/lib/dados/arquivos.ts`, acrescente (e importe `Recente` de `../tipos` e `type Resposta` de `./consulta`):

```ts
export async function listarRecentes(sb: SupabaseClient, limite = 5): Promise<Recente[]> {
  type Linha = {
    id: string;
    titulo: string;
    criado_em: string;
    alunos: { id: string; nome: string; turmas: { nome: string; cor: Recente['turma']['cor'] } };
  };
  const resposta = await sb
    .from('arquivos')
    .select('id,titulo,criado_em,alunos(id,nome,turmas(nome,cor))')
    .order('criado_em', { ascending: false })
    .limit(limite);
  const linhas = checar(resposta as unknown as Resposta<Linha[]>);
  return linhas.map((l) => ({
    id: l.id,
    titulo: l.titulo,
    criado_em: l.criado_em,
    aluno: { id: l.alunos.id, nome: l.alunos.nome },
    turma: { nome: l.alunos.turmas.nome, cor: l.alunos.turmas.cor },
  }));
}
```

Em `src/lib/dados/alunos.ts`, `buscarAlunos`: o `select` vira `'id,nome,turmas(id,nome,cor,anos_letivos(ano))'`, o tipo `Linha` ganha `cor: CorTurma` em `turmas` (importe `CorTurma` de `../ui/cores`) e o retorno vira `turma: { id: l.turmas.id, nome: l.turmas.nome, cor: l.turmas.cor }`.

- [ ] **Step 5: Rodar tudo**

Run: `npm run test:int && npm test && npm exec -- tsc --noEmit`
Expected: integração toda PASS (os novos inclusos); unitários PASS; tsc limpo. Se `tsc` acusar consumidores de `Turma` sem `cor` (ex.: `Scanner`/páginas que montam `Turma` à mão), acrescente a `cor` vinda do banco nesses pontos.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations src/lib tests/integration
git commit -m "feat(dados): cor da turma, turmas com contagem e trabalhos recentes"
```

---

### Task 3: Kit de componentes (menu inferior, ⋯, cabeçalho, cartões)

**Files:**
- Create: `src/components/ui/MenuInferior.tsx`, `MenuAcoes.tsx`, `Cabecalho.tsx`, `CartaoTurma.tsx`, `ItemLista.tsx`, `BarraProgresso.tsx`, `EtiquetaTurma.tsx`, `SeletorCor.tsx`, `PainelNome.tsx`, `ConfirmarApagar.tsx`
- Modify: `src/components/ui/Confirmar.tsx` (sobre `MenuInferior`, mesmas props), `src/components/ui/BotaoApagar.tsx` (passa a usar `ConfirmarApagar`), `src/components/ui/FormNome.tsx` (prop `autoFocus?`), `src/components/ui/BuscarAluno.tsx` (prop `autoFocus?`, ponto de cor)
- Test: `tests/e2e/menus.spec.ts`

**Interfaces:**
- Consumes: `ESTILO_COR`, `CORES`, `CorTurma` (Task 1); `contarArquivos`, `apagar` (`src/lib/dados/apagar.ts`); `Escopo` (`src/lib/tipos.ts`).
- Produces (props exatas):
  - `<MenuInferior aberto: boolean titulo: string onFechar: () => void>{children}</MenuInferior>` — `<dialog>` modal com nome acessível = `titulo`; filhos só montados quando aberto.
  - `type AcaoMenu = { rotulo: string; icone: LucideIcon; perigoso?: boolean; aoEscolher: () => void }`; `<MenuAcoes titulo: string acoes: AcaoMenu[] rotuloBotao?: string (default 'Mais ações') claro?: boolean />` — fecha o menu antes de chamar `aoEscolher`.
  - `<Cabecalho voltar?: { href: string; rotulo: string } titulo: string subtitulo?: ReactNode acoes?: ReactNode cor?: CorTurma>{abas internas opcionais}</Cabecalho>`
  - `<CartaoTurma turma: TurmaComContagem />` (link para `/turmas/{id}`, `data-cor`)
  - `<ItemLista href: string titulo: string detalhe?: ReactNode ponto?: CorTurma />`
  - `<BarraProgresso valor: number total: number />` (texto "`{valor}/{total} entregues`")
  - `<EtiquetaTurma cor: CorTurma texto: string />`
  - `<SeletorCor valor: CorTurma onMudar: (c: CorTurma) => void />` (radiogroup "Cor da turma")
  - `<PainelNome titulo rotulo textoBotao inicial? onSalvar: (nome) => Promise<void> onFechar />`
  - `<ConfirmarApagar escopo: Escopo descricao: string depois: string | 'refresh' onFechar: () => void />` (montado só quando deve aparecer)
  - `FormNome` e `BuscarAluno` aceitam `autoFocus?: boolean`.

- [ ] **Step 1: Escrever o E2E (falhando)**

`tests/e2e/menus.spec.ts`:

```ts
import { expect, test } from '@playwright/test';
import { clienteLogado, limparTudo, semear } from '../compartilhado/supabase';
import { entrar } from './ajuda';

test.beforeEach(async () => {
  await limparTudo();
});

test('confirmação de apagar é um menu inferior que fecha com Esc e com Cancelar', async ({ page }) => {
  const s = await semear(await clienteLogado());
  await entrar(page);
  await page.goto(`/turmas/${s.turmaId}`);

  await page.getByRole('button', { name: 'Apagar turma' }).click();
  const dialogo = page.getByRole('dialog', { name: 'Apagar a turma 3º A?' });
  await expect(dialogo).toContainText('Isso vai apagar 0 arquivo(s).');
  await page.keyboard.press('Escape');
  await expect(dialogo).toHaveCount(0);

  await page.getByRole('button', { name: 'Apagar turma' }).click();
  await dialogo.getByRole('button', { name: 'Cancelar' }).click();
  await expect(dialogo).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '3º A' })).toBeVisible();
});
```

Run: `npm run test:e2e -- menus.spec.ts` → Expected: FAIL (o diálogo atual não tem nome acessível nem fecha com Esc).

- [ ] **Step 2: `MenuInferior`**

`src/components/ui/MenuInferior.tsx`:

```tsx
'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

type Props = { aberto: boolean; titulo: string; onFechar: () => void; children: ReactNode };

const LIMIAR_ARRASTO = 80;

export function MenuInferior({ aberto, titulo, onFechar, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const inicioY = useRef<number | null>(null);
  const [deslocamento, setDeslocamento] = useState(0);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (aberto && !d.open) d.showModal();
    if (!aberto && d.open) d.close();
  }, [aberto]);

  return (
    <dialog
      ref={ref}
      aria-label={titulo}
      onCancel={(e) => {
        e.preventDefault();
        onFechar();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onFechar();
      }}
      className="fixed inset-x-0 bottom-0 top-auto m-0 w-full max-w-none bg-transparent p-0 backdrop:bg-slate-900/45 sm:mx-auto sm:max-w-lg"
    >
      {aberto && (
        <div
          className="max-h-[85dvh] overflow-y-auto rounded-t-2xl bg-white px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] text-slate-900 shadow-xl"
          style={{ transform: `translateY(${deslocamento}px)` }}
        >
          <div
            aria-hidden
            className="flex h-6 cursor-grab touch-none items-center justify-center"
            onPointerDown={(e) => {
              inicioY.current = e.clientY;
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              if (inicioY.current !== null) setDeslocamento(Math.max(0, e.clientY - inicioY.current));
            }}
            onPointerUp={() => {
              const arrastou = deslocamento;
              inicioY.current = null;
              setDeslocamento(0);
              if (arrastou > LIMIAR_ARRASTO) onFechar();
            }}
          >
            <span className="h-1 w-10 rounded-full bg-slate-300" />
          </div>
          <h2 className="mb-3 text-lg font-semibold">{titulo}</h2>
          {children}
        </div>
      )}
    </dialog>
  );
}
```

- [ ] **Step 3: `Confirmar`, `ConfirmarApagar`, `BotaoApagar`, `PainelNome`, `MenuAcoes`**

`src/components/ui/Confirmar.tsx` (substitui; props iguais):

```tsx
'use client';

import { MenuInferior } from './MenuInferior';

type Props = {
  titulo: string;
  mensagem: string;
  textoConfirmar: string;
  ocupado?: boolean;
  erro?: string | null;
  onConfirmar: () => void;
  onCancelar: () => void;
};

export function Confirmar({ titulo, mensagem, textoConfirmar, ocupado, erro, onConfirmar, onCancelar }: Props) {
  return (
    <MenuInferior aberto titulo={titulo} onFechar={onCancelar}>
      <p className="text-sm text-slate-600">{mensagem}</p>
      {erro && <p role="alert" className="mt-2 text-sm text-red-600">{erro}</p>}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button type="button" onClick={onCancelar} className="h-12 rounded-xl border border-slate-200 font-medium">
          Cancelar
        </button>
        <button
          type="button"
          onClick={onConfirmar}
          disabled={ocupado}
          className="h-12 rounded-xl bg-red-600 font-medium text-white disabled:opacity-50"
        >
          {textoConfirmar}
        </button>
      </div>
    </MenuInferior>
  );
}
```

`src/components/ui/ConfirmarApagar.tsx`:

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apagar, contarArquivos } from '@/lib/dados/apagar';
import { mensagemErro } from '@/lib/mensagemErro';
import { clienteNavegador } from '@/lib/supabase/navegador';
import type { Escopo } from '@/lib/tipos';
import { Confirmar } from './Confirmar';

type Props = { escopo: Escopo; descricao: string; depois: string | 'refresh'; onFechar: () => void };

export function ConfirmarApagar({ escopo, descricao, depois, onFechar }: Props) {
  const router = useRouter();
  const ehArquivo = escopo.tipo === 'arquivo';
  const [quantidade, setQuantidade] = useState<number | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (ehArquivo) return;
    let vivo = true;
    contarArquivos(clienteNavegador(), escopo).then(
      (n) => vivo && setQuantidade(n),
      (e) => vivo && setErro(mensagemErro(e)),
    );
    return () => {
      vivo = false;
    };
  }, [escopo, ehArquivo]);

  async function confirmar() {
    setOcupado(true);
    setErro(null);
    try {
      await apagar(clienteNavegador(), escopo);
      onFechar();
      if (depois !== 'refresh') router.push(depois);
      router.refresh();
    } catch (e) {
      setErro(mensagemErro(e));
    } finally {
      setOcupado(false);
    }
  }

  const mensagem = ehArquivo
    ? 'O arquivo será apagado definitivamente.'
    : quantidade === null
      ? 'Contando arquivos…'
      : `Isso vai apagar ${quantidade} arquivo(s). Não dá para desfazer.`;

  return (
    <Confirmar
      titulo={`Apagar ${descricao}?`}
      mensagem={mensagem}
      textoConfirmar="Apagar"
      ocupado={ocupado || (!ehArquivo && quantidade === null)}
      erro={erro}
      onConfirmar={confirmar}
      onCancelar={onFechar}
    />
  );
}
```

`src/components/ui/BotaoApagar.tsx` (substitui; mesmas props — usado até as Tasks 6–8 migrarem tudo para o ⋯):

```tsx
'use client';

import { useState } from 'react';
import type { Escopo } from '@/lib/tipos';
import { ConfirmarApagar } from './ConfirmarApagar';

type Props = { escopo: Escopo; rotulo: string; descricao: string; depois: string | 'refresh' };

export function BotaoApagar({ escopo, rotulo, descricao, depois }: Props) {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <button onClick={() => setAberto(true)} className="text-sm text-red-600">{rotulo}</button>
      {aberto && <ConfirmarApagar escopo={escopo} descricao={descricao} depois={depois} onFechar={() => setAberto(false)} />}
    </>
  );
}
```

`src/components/ui/PainelNome.tsx`:

```tsx
'use client';

import { FormNome } from './FormNome';
import { MenuInferior } from './MenuInferior';

type Props = {
  titulo: string;
  rotulo: string;
  textoBotao: string;
  inicial?: string;
  onSalvar: (nome: string) => Promise<void>;
  onFechar: () => void;
};

/** Menu inferior com um campo de nome; fecha sozinho depois de salvar. */
export function PainelNome({ titulo, rotulo, textoBotao, inicial, onSalvar, onFechar }: Props) {
  return (
    <MenuInferior aberto titulo={titulo} onFechar={onFechar}>
      <FormNome
        rotulo={rotulo}
        textoBotao={textoBotao}
        inicial={inicial}
        autoFocus
        onSalvar={async (nome) => {
          await onSalvar(nome);
          onFechar();
        }}
      />
    </MenuInferior>
  );
}
```

`src/components/ui/MenuAcoes.tsx`:

```tsx
'use client';

import { MoreHorizontal, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { MenuInferior } from './MenuInferior';

export type AcaoMenu = { rotulo: string; icone: LucideIcon; perigoso?: boolean; aoEscolher: () => void };

type Props = { titulo: string; acoes: AcaoMenu[]; rotuloBotao?: string; claro?: boolean };

export function MenuAcoes({ titulo, acoes, rotuloBotao = 'Mais ações', claro }: Props) {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-label={rotuloBotao}
        onClick={() => setAberto(true)}
        className={`flex h-11 w-11 items-center justify-center rounded-full ${claro ? 'text-white hover:bg-white/15' : 'text-slate-600 hover:bg-slate-100'}`}
      >
        <MoreHorizontal aria-hidden className="h-6 w-6" />
      </button>
      <MenuInferior aberto={aberto} titulo={titulo} onFechar={() => setAberto(false)}>
        <ul className="-mx-2">
          {acoes.map(({ rotulo, icone: Icone, perigoso, aoEscolher }) => (
            <li key={rotulo}>
              <button
                type="button"
                onClick={() => {
                  setAberto(false);
                  aoEscolher();
                }}
                className={`flex h-12 w-full items-center gap-3 rounded-xl px-2 text-left hover:bg-slate-50 ${perigoso ? 'text-red-600' : ''}`}
              >
                <Icone aria-hidden className="h-5 w-5" />
                {rotulo}
              </button>
            </li>
          ))}
        </ul>
      </MenuInferior>
    </>
  );
}
```

- [ ] **Step 4: Componentes visuais**

`src/components/ui/Cabecalho.tsx`:

```tsx
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { ESTILO_COR, type CorTurma } from '@/lib/ui/cores';

type Props = {
  voltar?: { href: string; rotulo: string };
  titulo: string;
  subtitulo?: ReactNode;
  acoes?: ReactNode;
  cor?: CorTurma;
  children?: ReactNode;
};

export function Cabecalho({ voltar, titulo, subtitulo, acoes, cor, children }: Props) {
  const fundo = cor ? `${ESTILO_COR[cor].forte} text-white` : 'border-b border-slate-200 bg-white text-slate-900';
  return (
    <header className={`-mx-4 -mt-4 mb-4 px-4 pt-2 ${children ? '' : 'pb-4'} ${fundo}`}>
      <div className="flex h-11 items-center justify-between gap-2">
        {voltar ? (
          <Link href={voltar.href} className={`flex min-w-0 items-center gap-1 text-sm ${cor ? 'text-white/90' : 'text-blue-600'}`}>
            <ChevronLeft aria-hidden className="h-4 w-4 shrink-0" />
            <span className="truncate">{voltar.rotulo}</span>
          </Link>
        ) : (
          <span />
        )}
        {acoes}
      </div>
      <h1 className="break-words text-2xl font-bold leading-tight">{titulo}</h1>
      {subtitulo && <div className={`mt-1 text-sm ${cor ? 'text-white/85' : 'text-slate-500'}`}>{subtitulo}</div>}
      {children}
    </header>
  );
}
```

`src/components/ui/CartaoTurma.tsx`:

```tsx
import Link from 'next/link';
import { ESTILO_COR } from '@/lib/ui/cores';
import type { TurmaComContagem } from '@/lib/tipos';

export function CartaoTurma({ turma }: { turma: TurmaComContagem }) {
  return (
    <Link
      href={`/turmas/${turma.id}`}
      data-cor={turma.cor}
      className={`flex h-24 min-w-0 flex-col justify-between rounded-xl p-3 text-white shadow-sm ${ESTILO_COR[turma.cor].forte}`}
    >
      <span className="truncate text-lg font-semibold">{turma.nome}</span>
      <span className="text-xs text-white/90">{turma.total_alunos} alunos</span>
    </Link>
  );
}
```

`src/components/ui/ItemLista.tsx`:

```tsx
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { ESTILO_COR, type CorTurma } from '@/lib/ui/cores';

type Props = { href: string; titulo: string; detalhe?: ReactNode; ponto?: CorTurma };

export function ItemLista({ href, titulo, detalhe, ponto }: Props) {
  return (
    <Link href={href} className="flex min-h-12 items-center gap-3 px-3 py-2">
      {ponto && <span aria-hidden className={`h-3 w-3 shrink-0 rounded-full ${ESTILO_COR[ponto].ponto}`} />}
      <span className="min-w-0 flex-1 truncate">{titulo}</span>
      {detalhe && <span className="shrink-0 text-sm text-slate-500">{detalhe}</span>}
      <ChevronRight aria-hidden className="h-4 w-4 shrink-0 text-slate-400" />
    </Link>
  );
}
```

`src/components/ui/BarraProgresso.tsx`:

```tsx
export function BarraProgresso({ valor, total }: { valor: number; total: number }) {
  const pct = total ? Math.round((valor / total) * 100) : 0;
  const cor = pct >= 75 ? 'bg-green-500' : pct >= 40 ? 'bg-amber-500' : 'bg-orange-500';
  return (
    <div>
      <div className="flex justify-between text-xs text-slate-500">
        <span>Entregues</span>
        <span>{valor}/{total} entregues</span>
      </div>
      <div role="progressbar" aria-valuenow={valor} aria-valuemin={0} aria-valuemax={total} className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200">
        <div className={`h-2 rounded-full ${cor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
```

`src/components/ui/EtiquetaTurma.tsx`:

```tsx
import { ESTILO_COR, type CorTurma } from '@/lib/ui/cores';

export function EtiquetaTurma({ cor, texto }: { cor: CorTurma; texto: string }) {
  const e = ESTILO_COR[cor];
  return <span className={`inline-block max-w-full truncate rounded-full px-2.5 py-0.5 text-xs font-medium ${e.suave} ${e.texto}`}>{texto}</span>;
}
```

`src/components/ui/SeletorCor.tsx`:

```tsx
'use client';

import { Check } from 'lucide-react';
import { CORES, ESTILO_COR, type CorTurma } from '@/lib/ui/cores';

export function SeletorCor({ valor, onMudar }: { valor: CorTurma; onMudar: (c: CorTurma) => void }) {
  return (
    <div role="radiogroup" aria-label="Cor da turma" className="flex flex-wrap gap-3">
      {CORES.map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={valor === c}
          aria-label={ESTILO_COR[c].nome}
          onClick={() => onMudar(c)}
          className={`flex h-11 w-11 items-center justify-center rounded-full text-white ${ESTILO_COR[c].forte} ${valor === c ? 'ring-4 ring-slate-300' : ''}`}
        >
          {valor === c && <Check aria-hidden className="h-5 w-5" />}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: `FormNome` e `BuscarAluno` com `autoFocus` e visual novo**

Em `src/components/ui/FormNome.tsx`: acrescente `autoFocus?: boolean` às `Props` e à desestruturação; passe `autoFocus={autoFocus}` ao `<input>`; troque as classes do input por `h-12 w-full rounded-xl border border-slate-200 bg-white px-3` e do botão por `h-12 rounded-xl bg-blue-600 px-4 font-medium text-white disabled:opacity-50`.

Em `src/components/ui/BuscarAluno.tsx`:
- acrescente `autoFocus?: boolean` às `Props`, à desestruturação e ao `<input>` (`autoFocus={autoFocus}`);
- input: `h-12 w-full rounded-xl border border-slate-200 bg-white px-3`;
- lista: `divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white`;
- cada resultado (botão ou link) ganha antes do texto `<span aria-hidden className={\`mr-2 inline-block h-2.5 w-2.5 rounded-full ${ESTILO_COR[r.turma.cor].ponto}\`} />` (importe `ESTILO_COR` de `@/lib/ui/cores`). O texto `rotuloDe(r)` não muda (E2E dependem dele).

- [ ] **Step 6: Rodar e ver passar**

Run: `npm exec -- tsc --noEmit && npm run lint && npm run test:e2e -- menus.spec.ts organizacao.spec.ts aluno.spec.ts`
Expected: tudo PASS (os specs antigos continuam passando porque `Confirmar`/`BotaoApagar` mantêm as props e o texto).

- [ ] **Step 7: Commit**

```bash
git add src/components/ui tests/e2e/menus.spec.ts
git commit -m "feat(ui): menu inferior, menu de ações, cabeçalho e componentes visuais"
```

---

### Task 4: Barra de abas, Início novo, Turmas, Buscar e Mais

**Files:**
- Create: `src/components/navegacao/BarraAbas.tsx`, `src/components/navegacao/BotaoEscanear.tsx`, `src/components/navegacao/MenuEscanear.tsx`, `src/components/inicio/SeletorAno.tsx`, `src/components/inicio/Recentes.tsx`, `src/components/turma/NovaTurma.tsx`, `src/lib/ui/cookieAno.ts`, `src/app/(app)/turmas/page.tsx`, `src/app/(app)/buscar/page.tsx`, `src/app/(app)/mais/page.tsx`, `tests/e2e/navegacao.spec.ts`
- Modify: `src/app/(app)/layout.tsx`, `src/app/(app)/page.tsx`, `src/app/layout.tsx` (classes do body), `src/app/(app)/anos/[anoId]/page.tsx` (import do novo `NovaTurma`), `src/components/fila/StatusFila.tsx`, `src/components/inicio/NovoAno.tsx`, `src/components/inicio/UsoStorage.tsx`, `src/components/BotaoSair.tsx`, `tests/e2e/auth.spec.ts`, `tests/e2e/organizacao.spec.ts`, `tests/e2e/modo-escuro.spec.ts`
- Delete: `src/components/ano/NovaTurma.tsx`

**Interfaces:**
- Consumes: Task 1 (`abaAtiva`, `barraVisivel`, `acaoDoBotao`, `COOKIE_ANO`, `escolherAno`, `sugerirCor`, `CorTurma`), Task 2 (`listarTurmasComContagem`, `listarTurmasPorAno`, `listarRecentes`, `criarTurma(sb, anoId, nome, cor)`, `Recente`), Task 3 (`MenuInferior`, `Cabecalho`, `CartaoTurma`, `ItemLista`, `SeletorCor`, `BuscarAluno` com `autoFocus`).
- Produces:
  - `<BarraAbas />` (nav `aria-label="Navegação principal"`; links "Início", "Turmas", "Buscar", "Mais" com `aria-current="page"` na ativa; botão central `aria-label="Escanear"`).
  - `<BotaoEscanear />` — nesta task, `lote-turma` vai para `/lote`; a Task 5 troca por `MenuLoteTurma`.
  - `<MenuEscanear onFechar />` — diálogo "O que você quer fazer?" com "Escanear lote", "Escanear para um aluno", "Enviar arquivo".
  - `<NovaTurma anoId: string coresUsadas: CorTurma[] />` — botão "Nova turma" + diálogo "Nova turma" (campo "Nome da turma", `SeletorCor`, botão "Criar turma").
  - `salvarAnoEscolhido(id: string): void` em `src/lib/ui/cookieAno.ts`.
  - Rotas `/turmas`, `/buscar`, `/mais`.

- [ ] **Step 1: Escrever os E2E (falhando)**

`tests/e2e/navegacao.spec.ts`:

```ts
import { expect, test, type Page } from '@playwright/test';
import { clienteLogado, limparTudo, semear, type Semente } from '../compartilhado/supabase';
import { entrar } from './ajuda';

const abas = (page: Page) => page.getByRole('navigation', { name: 'Navegação principal' });

let s: Semente;
test.beforeEach(async ({ page }) => {
  await limparTudo();
  s = await semear(await clienteLogado());
  await entrar(page);
});

test('abas levam às seções e marcam a aba ativa', async ({ page }) => {
  for (const [nome, url] of [['Turmas', '/turmas'], ['Buscar', '/buscar'], ['Mais', '/mais'], ['Início', '/']] as const) {
    await abas(page).getByRole('link', { name: nome }).click();
    await expect(page).toHaveURL(url);
    await expect(abas(page).getByRole('link', { name: nome })).toHaveAttribute('aria-current', 'page');
  }
  await page.goto(`/alunos/${s.alunos.maria}`);
  await expect(abas(page).getByRole('link', { name: 'Turmas' })).toHaveAttribute('aria-current', 'page');
});

test('Início mostra as turmas do ano e troca de ano (lembrando a escolha)', async ({ page }) => {
  const sb = await clienteLogado();
  const ano2025 = (await sb.from('anos_letivos').insert({ ano: 2025 }).select('id').single()).data!;
  await sb.from('turmas').insert({ ano_letivo_id: ano2025.id, nome: '2º B', cor: 'rosa' });
  await page.goto('/');

  await expect(page.getByRole('link', { name: /3º A/ })).toHaveAttribute('data-cor', 'azul');
  await page.getByRole('button', { name: /Ano letivo 2026/ }).click();
  await page.getByRole('dialog', { name: 'Ano letivo' }).getByRole('radio', { name: /2025/ }).click();
  await expect(page.getByRole('link', { name: /2º B/ })).toHaveAttribute('data-cor', 'rosa');
  await expect(page.getByRole('link', { name: /3º A/ })).toHaveCount(0);

  await page.reload();
  await expect(page.getByRole('link', { name: /2º B/ })).toBeVisible();
});

test('nomes muito longos não criam rolagem horizontal', async ({ page }) => {
  const sb = await clienteLogado();
  await sb.from('turmas').insert({ ano_letivo_id: s.anoId, nome: 'Turma com um nome exageradamente comprido para caber' });
  for (const url of ['/', '/turmas']) {
    await page.goto(url);
    const sobra = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(sobra).toBeLessThanOrEqual(0);
  }
});

test('📷 no Início abre o menu e leva à câmera do aluno escolhido', async ({ page }) => {
  await abas(page).getByRole('button', { name: 'Escanear' }).click();
  const menu = page.getByRole('dialog', { name: 'O que você quer fazer?' });
  await expect(menu.getByRole('button', { name: /Escanear lote/ })).toBeVisible();
  await expect(menu.getByRole('button', { name: /Enviar arquivo/ })).toBeVisible();
  await menu.getByRole('button', { name: /Escanear para um aluno/ }).click();
  const busca = page.getByRole('dialog', { name: 'Escanear para qual aluno?' });
  await busca.getByLabel('Nome do aluno').fill('maria');
  await busca.getByRole('button', { name: /Maria Souza/ }).click();
  await expect(page).toHaveURL(`/alunos/${s.alunos.maria}/escanear`);
  await expect(abas(page)).toHaveCount(0);
});
```

Substitua `tests/e2e/auth.spec.ts`, teste `'entra e sai'`, por:

```ts
test('entra e sai', async ({ page }) => {
  await entrar(page);
  await expect(page.getByRole('heading', { name: 'Início' })).toBeVisible();
  await page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('link', { name: 'Mais' }).click();
  await page.getByRole('button', { name: 'Sair' }).click();
  await expect(page).toHaveURL(/\/login$/);
});
```

Substitua `tests/e2e/organizacao.spec.ts` inteiro por:

```ts
import { expect, test, type Page } from '@playwright/test';
import { limparTudo } from '../compartilhado/supabase';
import { entrar } from './ajuda';

const abas = (page: Page) => page.getByRole('navigation', { name: 'Navegação principal' });

async function criarAnoETurma(page: Page, turma: string, cor: string) {
  await abas(page).getByRole('link', { name: 'Mais' }).click();
  await page.getByLabel('Ano', { exact: true }).fill('2026');
  await page.getByRole('button', { name: 'Criar ano' }).click();
  await expect(page.getByRole('link', { name: '2026' })).toBeVisible();
  await abas(page).getByRole('link', { name: 'Início' }).click();
  await expect(page.getByText('Nenhuma turma em 2026')).toBeVisible();
  await page.getByRole('button', { name: 'Nova turma' }).click();
  const painel = page.getByRole('dialog', { name: 'Nova turma' });
  await painel.getByLabel('Nome da turma').fill(turma);
  await painel.getByRole('radio', { name: cor }).click();
  await painel.getByRole('button', { name: 'Criar turma' }).click();
  const cartao = page.getByRole('link', { name: new RegExp(turma) });
  await expect(cartao).toHaveAttribute('data-cor', cor.toLowerCase());
  await cartao.click();
}

test.beforeEach(async () => {
  await limparTudo();
});

test('cria ano, turma colorida, alunos colados e atividade; busca sem acento', async ({ page }) => {
  await entrar(page);
  await criarAnoETurma(page, '3º A', 'Verde');

  await page.getByLabel('Cole um nome por linha').fill('Maria Souza\n\n  João Pedro \nmaria souza\nAna');
  await page.getByRole('button', { name: 'Adicionar alunos' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'adicionados' })).toHaveText('3 adicionados, 1 ignorado');
  await expect(page.getByRole('link', { name: /João Pedro/ })).toBeVisible();

  await page.getByRole('tab', { name: 'Atividades' }).click();
  await page.getByLabel('Nome da atividade').fill('Prova 1');
  await page.getByRole('button', { name: 'Criar atividade' }).click();
  await expect(page.getByText('0/3 entregues')).toBeVisible();

  await abas(page).getByRole('link', { name: 'Buscar' }).click();
  await page.getByLabel('Buscar aluno').fill('joao');
  await expect(page.getByRole('link', { name: 'João Pedro — 3º A (2026)' })).toBeVisible();
});

test('apagar turma pede confirmação com a contagem de arquivos', async ({ page }) => {
  await entrar(page);
  await criarAnoETurma(page, '3º B', 'Roxo');

  await page.getByRole('button', { name: 'Apagar turma' }).click();
  const dialogo = page.getByRole('dialog');
  await expect(dialogo).toContainText('Isso vai apagar 0 arquivo(s).');
  await dialogo.getByRole('button', { name: 'Apagar' }).click();
  await expect(page.getByRole('heading', { name: '2026' })).toBeVisible();
  await expect(page.getByRole('link', { name: '3º B' })).toHaveCount(0);
});
```

Substitua `tests/e2e/modo-escuro.spec.ts`, o teste existente, por:

```ts
test('com o SO em modo escuro, listas, cartões e barra de abas continuam legíveis', async ({ page }) => {
  await entrar(page);
  await page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('link', { name: 'Mais' }).click();
  await page.getByLabel('Ano', { exact: true }).fill('2026');
  await page.getByRole('button', { name: 'Criar ano' }).click();
  const link = page.getByRole('link', { name: '2026' });
  await expect(link).toBeVisible();
  const luminancia = async (cor: string) => {
    const [r, g, b] = cor.match(/\d+(\.\d+)?/g)!.slice(0, 3).map(Number);
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  };
  expect(await luminancia(await link.evaluate((el) => getComputedStyle(el).color))).toBeLessThan(0.5);
  const barra = page.getByRole('navigation', { name: 'Navegação principal' });
  expect(await barra.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe('rgb(255, 255, 255)');
  const fundo = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(fundo).not.toBe('rgb(10, 10, 10)');
});
```

Run: `npm run test:e2e -- navegacao.spec.ts auth.spec.ts organizacao.spec.ts modo-escuro.spec.ts`
Expected: FAIL (não há barra de abas, `/mais`, `/turmas` etc.).

- [ ] **Step 2: Cookie do ano, barra de abas e botão 📷**

`src/lib/ui/cookieAno.ts`:

```ts
import { COOKIE_ANO } from './ano';

/** Lembra o ano escolhido no Início (lido pelo servidor). */
export function salvarAnoEscolhido(id: string): void {
  document.cookie = `${COOKIE_ANO}=${encodeURIComponent(id)}; path=/; max-age=31536000; samesite=lax`;
}
```

`src/components/navegacao/BarraAbas.tsx`:

```tsx
'use client';

import { House, Menu, Search, Users, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { abaAtiva, barraVisivel, type Aba } from '@/lib/ui/navegacao';
import { BotaoEscanear } from './BotaoEscanear';

type Item = { aba: Aba; href: string; rotulo: string; Icone: LucideIcon };

const ESQUERDA: Item[] = [
  { aba: 'inicio', href: '/', rotulo: 'Início', Icone: House },
  { aba: 'turmas', href: '/turmas', rotulo: 'Turmas', Icone: Users },
];
const DIREITA: Item[] = [
  { aba: 'buscar', href: '/buscar', rotulo: 'Buscar', Icone: Search },
  { aba: 'mais', href: '/mais', rotulo: 'Mais', Icone: Menu },
];

export function BarraAbas() {
  const pathname = usePathname();
  if (!barraVisivel(pathname)) return null;
  const ativa = abaAtiva(pathname);

  const link = ({ aba, href, rotulo, Icone }: Item) => (
    <Link
      key={aba}
      href={href}
      aria-current={ativa === aba ? 'page' : undefined}
      className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] ${ativa === aba ? 'font-semibold text-blue-600' : 'text-slate-500'}`}
    >
      <Icone aria-hidden className="h-6 w-6" />
      {rotulo}
    </Link>
  );

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)]"
    >
      <div className="mx-auto flex max-w-2xl items-end px-2">
        {ESQUERDA.map(link)}
        <div className="flex flex-1 justify-center">
          <BotaoEscanear />
        </div>
        {DIREITA.map(link)}
      </div>
    </nav>
  );
}
```

`src/components/navegacao/BotaoEscanear.tsx`:

```tsx
'use client';

import { Camera } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { acaoDoBotao } from '@/lib/ui/navegacao';
import { MenuEscanear } from './MenuEscanear';

export function BotaoEscanear() {
  const pathname = usePathname();
  const router = useRouter();
  const [menu, setMenu] = useState(false);

  function tocar() {
    const acao = acaoDoBotao(pathname);
    if (acao.tipo === 'ir') router.push(acao.href);
    else if (acao.tipo === 'lote-turma') router.push('/lote');
    else setMenu(true);
  }

  return (
    <>
      <button
        type="button"
        aria-label="Escanear"
        onClick={tocar}
        className="-mt-5 mb-1 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-600/40"
      >
        <Camera aria-hidden className="h-6 w-6" />
      </button>
      {menu && <MenuEscanear onFechar={() => setMenu(false)} />}
    </>
  );
}
```

`src/components/navegacao/MenuEscanear.tsx`:

```tsx
'use client';

import { FileUp, Layers, UserRound, type LucideIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { BuscarAluno } from '@/components/ui/BuscarAluno';
import { MenuInferior } from '@/components/ui/MenuInferior';

type Etapa = 'opcoes' | 'escanear' | 'enviar';

const TITULO: Record<Etapa, string> = {
  opcoes: 'O que você quer fazer?',
  escanear: 'Escanear para qual aluno?',
  enviar: 'Enviar para qual aluno?',
};

function Opcao({ Icone, titulo, detalhe, cor, onClick }: { Icone: LucideIcon; titulo: string; detalhe: string; cor: string; onClick: () => void }) {
  return (
    <li>
      <button type="button" onClick={onClick} className="flex w-full items-center gap-3 rounded-xl px-2 py-3 text-left hover:bg-slate-50">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${cor}`}>
          <Icone aria-hidden className="h-5 w-5" />
        </span>
        <span>
          <span className="block font-medium">{titulo}</span>
          <span className="block text-sm text-slate-500">{detalhe}</span>
        </span>
      </button>
    </li>
  );
}

export function MenuEscanear({ onFechar }: { onFechar: () => void }) {
  const router = useRouter();
  const [etapa, setEtapa] = useState<Etapa>('opcoes');
  const ir = (href: string) => {
    onFechar();
    router.push(href);
  };

  return (
    <MenuInferior aberto titulo={TITULO[etapa]} onFechar={onFechar}>
      {etapa === 'opcoes' ? (
        <ul className="-mx-2">
          <Opcao Icone={Layers} titulo="Escanear lote" detalhe="Uma atividade, vários alunos" cor="bg-blue-100 text-blue-700" onClick={() => ir('/lote')} />
          <Opcao Icone={UserRound} titulo="Escanear para um aluno" detalhe="Buscar o aluno e abrir a câmera" cor="bg-green-100 text-green-700" onClick={() => setEtapa('escanear')} />
          <Opcao Icone={FileUp} titulo="Enviar arquivo" detalhe="PDF ou fotos do celular" cor="bg-orange-100 text-orange-700" onClick={() => setEtapa('enviar')} />
        </ul>
      ) : (
        <BuscarAluno
          rotulo="Nome do aluno"
          autoFocus
          onEscolher={(r) => ir(`/alunos/${r.id}/${etapa === 'escanear' ? 'escanear' : 'enviar'}`)}
        />
      )}
    </MenuInferior>
  );
}
```

- [ ] **Step 3: Layout, faixa de pendentes e corpo**

`src/app/(app)/layout.tsx`:

```tsx
import { StatusFila } from '@/components/fila/StatusFila';
import { BarraAbas } from '@/components/navegacao/BarraAbas';

export default function LayoutApp({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-slate-50 pb-[calc(6rem+env(safe-area-inset-bottom))]">
      <main className="mx-auto max-w-2xl px-4 pt-4">{children}</main>
      <div className="fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-20">
        <StatusFila />
      </div>
      <BarraAbas />
    </div>
  );
}
```

Em `src/app/layout.tsx`, o `body` passa a `className="bg-slate-50 text-slate-900 antialiased"`.

`src/components/fila/StatusFila.tsx` — mantenha a lógica (refresh quando a fila diminui, descartar com `Confirmar`) e troque o JSX de retorno (depois do `if (!itens.length) return null;`) por:

```tsx
  return (
    <div role="status" className="mx-auto max-w-2xl px-3 pb-2">
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 text-sm shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <button type="button" aria-expanded={aberta} onClick={() => setAberta((a) => !a)} className="flex min-h-11 items-center gap-2 font-medium">
            <CloudUpload aria-hidden className="h-4 w-4" />
            {itens.length} envio(s) pendente(s)
          </button>
          <button type="button" onClick={() => void processar()} className="min-h-11 text-blue-600">Tentar de novo</button>
        </div>
        {aberta && (
          <ul className="space-y-1 pb-2">
            {itens.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate">
                  {i.titulo}
                  {i.ultimoErro && <span className="text-red-600"> — {i.ultimoErro}</span>}
                </span>
                <button type="button" onClick={() => setDescartando(i)} className="min-h-11 text-red-600">Descartar</button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {descartando && (
        <Confirmar
          titulo="Descartar envio?"
          mensagem={`“${descartando.titulo}” ainda não foi enviado e será perdido.`}
          textoConfirmar="Descartar"
          onCancelar={() => setDescartando(null)}
          onConfirmar={async () => {
            await descartar(descartando.id);
            setDescartando(null);
          }}
        />
      )}
    </div>
  );
```

e acrescente `const [aberta, setAberta] = useState(false);` junto aos outros estados e `import { CloudUpload } from 'lucide-react';`.

- [ ] **Step 4: Nova turma com cor**

`src/components/turma/NovaTurma.tsx`:

```tsx
'use client';

import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useId, useState, type FormEvent } from 'react';
import { MenuInferior } from '@/components/ui/MenuInferior';
import { SeletorCor } from '@/components/ui/SeletorCor';
import { criarTurma } from '@/lib/dados/turmas';
import { limparNome } from '@/lib/dominio/nomes';
import { mensagemErro } from '@/lib/mensagemErro';
import { clienteNavegador } from '@/lib/supabase/navegador';
import { sugerirCor, type CorTurma } from '@/lib/ui/cores';

type Props = { anoId: string; coresUsadas: CorTurma[] };

function FormTurma({ anoId, coresUsadas, onFechar }: Props & { onFechar: () => void }) {
  const router = useRouter();
  const id = useId();
  const [nome, setNome] = useState('');
  const [cor, setCor] = useState<CorTurma>(() => sugerirCor(coresUsadas));
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function criar(e: FormEvent) {
    e.preventDefault();
    const limpo = limparNome(nome);
    if (!limpo) return;
    setOcupado(true);
    setErro(null);
    try {
      await criarTurma(clienteNavegador(), anoId, limpo, cor);
      onFechar();
      router.refresh();
    } catch (err) {
      setErro(mensagemErro(err));
    } finally {
      setOcupado(false);
    }
  }

  return (
    <MenuInferior aberto titulo="Nova turma" onFechar={onFechar}>
      <form onSubmit={criar} className="space-y-4">
        <div>
          <label htmlFor={id} className="block text-sm">Nome da turma</label>
          <input id={id} autoFocus value={nome} onChange={(e) => setNome(e.target.value)} placeholder="ex.: 3º A" className="mt-1 h-12 w-full rounded-xl border border-slate-200 px-3" />
        </div>
        <div>
          <p className="mb-2 text-sm">Cor</p>
          <SeletorCor valor={cor} onMudar={setCor} />
        </div>
        {erro && <p role="alert" className="text-sm text-red-600">{erro}</p>}
        <button disabled={ocupado} className="h-12 w-full rounded-xl bg-blue-600 font-medium text-white disabled:opacity-50">Criar turma</button>
      </form>
    </MenuInferior>
  );
}

export function NovaTurma({ anoId, coresUsadas }: Props) {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setAberto(true)} className="inline-flex h-11 items-center gap-1 rounded-full px-3 font-medium text-blue-600 hover:bg-blue-50">
        <Plus aria-hidden className="h-5 w-5" />
        Nova turma
      </button>
      {aberto && <FormTurma anoId={anoId} coresUsadas={coresUsadas} onFechar={() => setAberto(false)} />}
    </>
  );
}
```

Apague `src/components/ano/NovaTurma.tsx`. Em `src/app/(app)/anos/[anoId]/page.tsx`, importe `NovaTurma` de `@/components/turma/NovaTurma` e passe `coresUsadas={turmas.map((t) => t.cor)}`.

- [ ] **Step 5: Início**

`src/components/inicio/SeletorAno.tsx`:

```tsx
'use client';

import { Check, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { MenuInferior } from '@/components/ui/MenuInferior';
import type { AnoLetivo } from '@/lib/tipos';
import { salvarAnoEscolhido } from '@/lib/ui/cookieAno';

export function SeletorAno({ anos, atual }: { anos: AnoLetivo[]; atual: AnoLetivo }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);

  function escolher(id: string) {
    salvarAnoEscolhido(id);
    setAberto(false);
    router.refresh();
  }

  return (
    <>
      <button type="button" onClick={() => setAberto(true)} className="inline-flex h-11 items-center gap-1 font-medium text-blue-600">
        Ano letivo {atual.ano}
        <ChevronDown aria-hidden className="h-4 w-4" />
      </button>
      <MenuInferior aberto={aberto} titulo="Ano letivo" onFechar={() => setAberto(false)}>
        <ul role="radiogroup" aria-label="Ano letivo" className="-mx-2">
          {anos.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                role="radio"
                aria-checked={a.id === atual.id}
                onClick={() => escolher(a.id)}
                className="flex h-12 w-full items-center justify-between rounded-xl px-2 hover:bg-slate-50"
              >
                <span>
                  {a.ano}
                  {a.arquivado && <span className="ml-2 text-sm text-slate-500">arquivado</span>}
                </span>
                {a.id === atual.id && <Check aria-hidden className="h-5 w-5 text-blue-600" />}
              </button>
            </li>
          ))}
        </ul>
      </MenuInferior>
    </>
  );
}
```

`src/components/inicio/Recentes.tsx`:

```tsx
import Link from 'next/link';
import { EtiquetaTurma } from '@/components/ui/EtiquetaTurma';
import type { Recente } from '@/lib/tipos';

export function Recentes({ itens }: { itens: Recente[] }) {
  return (
    <section className="space-y-2">
      <h2 className="font-semibold">Recentes</h2>
      <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {itens.map((r) => (
          <li key={r.id}>
            <Link href={`/alunos/${r.aluno.id}`} className="flex min-h-14 items-center gap-3 px-3 py-2">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{r.titulo}</span>
                <span className="flex min-w-0 items-center gap-2 text-sm text-slate-500">
                  <span className="truncate">{r.aluno.nome}</span>
                  <EtiquetaTurma cor={r.turma.cor} texto={r.turma.nome} />
                </span>
              </span>
              <span className="shrink-0 text-xs text-slate-500">{new Date(r.criado_em).toLocaleDateString('pt-BR')}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

`src/app/(app)/page.tsx` (substitui):

```tsx
import { Search } from 'lucide-react';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { Recentes } from '@/components/inicio/Recentes';
import { SeletorAno } from '@/components/inicio/SeletorAno';
import { NovaTurma } from '@/components/turma/NovaTurma';
import { Cabecalho } from '@/components/ui/Cabecalho';
import { CartaoTurma } from '@/components/ui/CartaoTurma';
import { listarAnos } from '@/lib/dados/anos';
import { listarRecentes } from '@/lib/dados/arquivos';
import { listarTurmasComContagem } from '@/lib/dados/turmas';
import { clienteServidor } from '@/lib/supabase/servidor';
import { COOKIE_ANO, escolherAno } from '@/lib/ui/ano';

export default async function Inicio() {
  const sb = await clienteServidor();
  const cookieAno = (await cookies()).get(COOKIE_ANO)?.value;
  const [anos, recentes] = await Promise.all([listarAnos(sb), listarRecentes(sb)]);
  const ano = escolherAno(anos, cookieAno);
  const turmas = ano ? await listarTurmasComContagem(sb, ano.id) : [];

  return (
    <div className="space-y-6">
      <Cabecalho titulo="Início" subtitulo={ano ? <SeletorAno anos={anos} atual={ano} /> : undefined} />
      <Link href="/buscar" className="flex h-12 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-slate-400">
        <Search aria-hidden className="h-5 w-5" />
        Buscar aluno…
      </Link>

      {!ano ? (
        <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 text-center">
          <p className="text-slate-600">Nenhum ano letivo ainda.</p>
          <Link href="/mais" className="inline-flex h-12 items-center rounded-xl bg-blue-600 px-4 font-medium text-white">Criar ano letivo</Link>
        </section>
      ) : (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Turmas de {ano.ano}</h2>
            <NovaTurma anoId={ano.id} coresUsadas={turmas.map((t) => t.cor)} />
          </div>
          {turmas.length ? (
            <div className="grid grid-cols-2 gap-3">
              {turmas.map((t) => <CartaoTurma key={t.id} turma={t} />)}
            </div>
          ) : (
            <p className="text-sm text-slate-500">Nenhuma turma em {ano.ano}</p>
          )}
        </section>
      )}

      {recentes.length > 0 && <Recentes itens={recentes} />}
    </div>
  );
}
```

- [ ] **Step 6: Turmas, Buscar e Mais**

`src/app/(app)/turmas/page.tsx`:

```tsx
import { cookies } from 'next/headers';
import Link from 'next/link';
import { NovaTurma } from '@/components/turma/NovaTurma';
import { Cabecalho } from '@/components/ui/Cabecalho';
import { ItemLista } from '@/components/ui/ItemLista';
import { listarAnos } from '@/lib/dados/anos';
import { listarTurmasPorAno } from '@/lib/dados/turmas';
import { clienteServidor } from '@/lib/supabase/servidor';
import { COOKIE_ANO, escolherAno } from '@/lib/ui/ano';

export default async function PaginaTurmas() {
  const sb = await clienteServidor();
  const cookieAno = (await cookies()).get(COOKIE_ANO)?.value;
  const [anos, turmas] = await Promise.all([listarAnos(sb), listarTurmasPorAno(sb)]);
  const atual = escolherAno(anos, cookieAno);
  const ordenados = [...anos].sort((a, b) => Number(a.arquivado) - Number(b.arquivado) || b.ano - a.ano);

  return (
    <div className="space-y-4">
      <Cabecalho
        titulo="Turmas"
        acoes={atual ? <NovaTurma anoId={atual.id} coresUsadas={turmas.filter((t) => t.ano.id === atual.id).map((t) => t.cor)} /> : undefined}
      />
      {!anos.length && (
        <p className="text-sm text-slate-600">
          Crie um ano letivo em <Link href="/mais" className="text-blue-600">Mais</Link>.
        </p>
      )}
      {ordenados.map((a) => {
        const doAno = turmas.filter((t) => t.ano.id === a.id);
        return (
          <details key={a.id} open={a.id === atual?.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <summary className="flex min-h-12 cursor-pointer items-center justify-between px-3 font-semibold">
              <span>
                {a.ano}
                {a.arquivado && <span className="ml-2 text-sm font-normal text-slate-500">arquivado</span>}
              </span>
              <span className="text-sm font-normal text-slate-500">{doAno.length} turmas</span>
            </summary>
            <ul className="divide-y divide-slate-100 border-t border-slate-100">
              {doAno.map((t) => (
                <li key={t.id}>
                  <ItemLista href={`/turmas/${t.id}`} titulo={t.nome} detalhe={`${t.total_alunos} alunos`} ponto={t.cor} />
                </li>
              ))}
            </ul>
            <Link href={`/anos/${a.id}`} className="block border-t border-slate-100 px-3 py-3 text-sm text-blue-600">Ver ano {a.ano}</Link>
          </details>
        );
      })}
    </div>
  );
}
```

`src/app/(app)/buscar/page.tsx`:

```tsx
import { Cabecalho } from '@/components/ui/Cabecalho';
import { BuscarAluno } from '@/components/ui/BuscarAluno';

export default function PaginaBuscar() {
  return (
    <div className="space-y-4">
      <Cabecalho titulo="Buscar" />
      <BuscarAluno autoFocus />
    </div>
  );
}
```

`src/app/(app)/mais/page.tsx`:

```tsx
import { BotaoSair } from '@/components/BotaoSair';
import { NovoAno } from '@/components/inicio/NovoAno';
import { UsoStorage } from '@/components/inicio/UsoStorage';
import { Cabecalho } from '@/components/ui/Cabecalho';
import { ItemLista } from '@/components/ui/ItemLista';
import { listarAnos } from '@/lib/dados/anos';
import { usoStorage } from '@/lib/dados/arquivos';
import { clienteServidor } from '@/lib/supabase/servidor';

export default async function PaginaMais() {
  const sb = await clienteServidor();
  const [anos, uso] = await Promise.all([listarAnos(sb), usoStorage(sb)]);
  return (
    <div className="space-y-6">
      <Cabecalho titulo="Mais" />
      <section className="space-y-3">
        <h2 className="font-semibold">Anos letivos</h2>
        {anos.length > 0 && (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
            {anos.map((a) => (
              <li key={a.id}>
                <ItemLista href={`/anos/${a.id}`} titulo={String(a.ano)} detalhe={a.arquivado ? 'arquivado' : undefined} />
              </li>
            ))}
          </ul>
        )}
        <NovoAno />
      </section>
      <section className="space-y-2 rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="font-semibold">Armazenamento</h2>
        <UsoStorage bytes={uso} />
      </section>
      <BotaoSair />
    </div>
  );
}
```

Reestilize (só classes, sem mudar textos/rótulos):
- `NovoAno`: input `h-12 w-28 rounded-xl border border-slate-200 bg-white px-3`; botão `h-12 rounded-xl bg-blue-600 px-4 font-medium text-white`.
- `UsoStorage`: barra `h-2 rounded-full bg-slate-200` / preenchimento `h-2 rounded-full`.
- `BotaoSair`: `h-12 w-full rounded-xl border border-slate-200 bg-white font-medium text-red-600`.

- [ ] **Step 7: Rodar e ver passar**

Run: `npm exec -- tsc --noEmit && npm run lint && npm run build && npm run test:e2e`
Expected: tudo PASS (suíte completa, incluindo os novos de navegação). Se a regra de lint do React reclamar de `document.cookie`, ela não deve, pois a escrita está fora do componente (`cookieAno.ts`).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(ui): barra de abas, Início por ano com turmas coloridas, Turmas, Buscar e Mais"
```

---

### Task 5: 📷 na turma abre o lote da turma

**Files:**
- Create: `src/components/navegacao/MenuLoteTurma.tsx`, `tests/e2e/escanear-contexto.spec.ts`
- Modify: `src/components/navegacao/BotaoEscanear.tsx`, `tests/e2e/scanner.spec.ts` (teste avulso usa o 📷)

**Interfaces:**
- Consumes: `MenuInferior`, `FormNome` (Task 3); `obterTurma`, `listarAtividades`, `criarAtividade`, `listarAlunos`; `hojeIso`, `formatarData`; `acaoDoBotao` (Task 1).
- Produces: `<MenuLoteTurma turmaId: string onFechar: () => void />` — diálogo "Escanear lote — {turma}".

- [ ] **Step 1: Escrever os E2E (falhando)**

`tests/e2e/escanear-contexto.spec.ts`:

```ts
import { expect, test, type Page } from '@playwright/test';
import { clienteLogado, limparTudo, semear, type Semente } from '../compartilhado/supabase';
import { entrar } from './ajuda';

const escanear = (page: Page) =>
  page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('button', { name: 'Escanear' });

let s: Semente;
test.beforeEach(async ({ page }) => {
  await limparTudo();
  s = await semear(await clienteLogado());
  await entrar(page);
});

test('📷 na pasta do aluno abre a câmera dele', async ({ page }) => {
  await page.goto(`/alunos/${s.alunos.maria}`);
  await escanear(page).click();
  await expect(page).toHaveURL(`/alunos/${s.alunos.maria}/escanear`);
});

test('📷 na turma lista as atividades e leva ao lote escolhido', async ({ page }) => {
  await page.goto(`/turmas/${s.turmaId}`);
  await escanear(page).click();
  const menu = page.getByRole('dialog', { name: 'Escanear lote — 3º A' });
  await menu.getByRole('button', { name: 'Prova 1' }).click();
  await expect(page).toHaveURL(`/lote/${s.atividadeId}`);
});

test('📷 na turma sem atividades abre direto o criar', async ({ page }) => {
  const sb = await clienteLogado();
  await sb.from('atividades').delete().eq('id', s.atividadeId);
  await page.goto(`/turmas/${s.turmaId}`);
  await escanear(page).click();
  const menu = page.getByRole('dialog', { name: 'Escanear lote — 3º A' });
  const campo = menu.getByLabel('Nova atividade');
  await expect(campo).toBeFocused();
  await campo.fill('Redação');
  await menu.getByRole('button', { name: 'Criar e escanear' }).click();
  await expect(page).toHaveURL(/\/lote\/[0-9a-f-]{36}$/);
});

test('📷 numa turma sem alunos avisa para adicionar alunos', async ({ page }) => {
  const sb = await clienteLogado();
  const vazia = (await sb.from('turmas').insert({ ano_letivo_id: s.anoId, nome: '9º Z' }).select('id').single()).data!;
  await page.goto(`/turmas/${vazia.id}`);
  await escanear(page).click();
  await expect(page.getByRole('dialog', { name: 'Escanear lote — 9º Z' })).toContainText('Adicione alunos primeiro');
});
```

Em `tests/e2e/scanner.spec.ts`, teste `'avulso: …'`, troque a linha `await page.getByRole('link', { name: 'Escanear' }).click();` por:

```ts
  await page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('button', { name: 'Escanear' }).click();
```

Run: `npm run test:e2e -- escanear-contexto.spec.ts` → Expected: os dois testes de turma FALHAM (o 📷 ainda vai para `/lote`); o do aluno passa.

- [ ] **Step 2: `MenuLoteTurma`**

`src/components/navegacao/MenuLoteTurma.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FormNome } from '@/components/ui/FormNome';
import { MenuInferior } from '@/components/ui/MenuInferior';
import { listarAlunos } from '@/lib/dados/alunos';
import { criarAtividade, listarAtividades } from '@/lib/dados/atividades';
import { obterTurma } from '@/lib/dados/turmas';
import { formatarData, hojeIso } from '@/lib/dominio/formato';
import { mensagemErro } from '@/lib/mensagemErro';
import { clienteNavegador } from '@/lib/supabase/navegador';
import type { Atividade, TurmaDetalhe } from '@/lib/tipos';

type Dados = { turma: TurmaDetalhe; atividades: Atividade[]; totalAlunos: number };

export function MenuLoteTurma({ turmaId, onFechar }: { turmaId: string; onFechar: () => void }) {
  const router = useRouter();
  const [dados, setDados] = useState<Dados | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let vivo = true;
    const sb = clienteNavegador();
    Promise.all([obterTurma(sb, turmaId), listarAtividades(sb, turmaId), listarAlunos(sb, turmaId)]).then(
      ([turma, atividades, alunos]) => vivo && setDados({ turma, atividades, totalAlunos: alunos.length }),
      (e) => vivo && setErro(mensagemErro(e)),
    );
    return () => {
      vivo = false;
    };
  }, [turmaId, tentativa]);

  const irParaLote = (atividadeId: string) => {
    onFechar();
    router.push(`/lote/${atividadeId}`);
  };

  return (
    <MenuInferior aberto titulo={dados ? `Escanear lote — ${dados.turma.nome}` : 'Escanear lote'} onFechar={onFechar}>
      {erro ? (
        <div className="space-y-3">
          <p role="alert" className="text-sm text-red-600">{erro}</p>
          <button
            type="button"
            onClick={() => {
              setErro(null);
              setTentativa((t) => t + 1);
            }}
            className="h-12 w-full rounded-xl border border-slate-200 font-medium"
          >
            Tentar de novo
          </button>
        </div>
      ) : !dados ? (
        <p className="text-sm text-slate-500">Carregando…</p>
      ) : dados.totalAlunos === 0 ? (
        <div className="space-y-3">
          <p className="text-slate-600">Adicione alunos primeiro.</p>
          <Link href={`/turmas/${turmaId}?aba=alunos`} onClick={onFechar} className="flex h-12 items-center justify-center rounded-xl bg-blue-600 font-medium text-white">
            Ir para os alunos
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {dados.atividades.length > 0 && (
            <div>
              <p className="mb-1 text-sm text-slate-500">Escolha a atividade</p>
              <ul className="-mx-2">
                {dados.atividades.map((a) => (
                  <li key={a.id}>
                    <button type="button" onClick={() => irParaLote(a.id)} className="flex h-12 w-full items-center justify-between gap-2 rounded-xl px-2 text-left hover:bg-slate-50">
                      <span className="truncate font-medium">{a.nome}</span>
                      {a.data && <span aria-hidden className="shrink-0 text-sm text-slate-500">{formatarData(a.data)}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <FormNome
            rotulo="Nova atividade"
            textoBotao="Criar e escanear"
            autoFocus={dados.atividades.length === 0}
            onSalvar={async (nome) => {
              const nova = await criarAtividade(clienteNavegador(), turmaId, nome, hojeIso());
              irParaLote(nova.id);
            }}
          />
        </div>
      )}
    </MenuInferior>
  );
}
```

- [ ] **Step 3: Ligar no botão**

Em `src/components/navegacao/BotaoEscanear.tsx`:
- troque o estado por `const [menu, setMenu] = useState<null | { tipo: 'geral' } | { tipo: 'turma'; turmaId: string }>(null);`
- em `tocar`: `if (acao.tipo === 'ir') router.push(acao.href); else if (acao.tipo === 'lote-turma') setMenu({ tipo: 'turma', turmaId: acao.turmaId }); else setMenu({ tipo: 'geral' });`
- no JSX, troque a linha do `MenuEscanear` por:

```tsx
      {menu?.tipo === 'geral' && <MenuEscanear onFechar={() => setMenu(null)} />}
      {menu?.tipo === 'turma' && <MenuLoteTurma turmaId={menu.turmaId} onFechar={() => setMenu(null)} />}
```

(importe `MenuLoteTurma` de `./MenuLoteTurma`).

- [ ] **Step 4: Rodar e ver passar**

Run: `npm exec -- tsc --noEmit && npm run lint && npm run test:e2e -- escanear-contexto.spec.ts scanner.spec.ts navegacao.spec.ts`
Expected: tudo PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(ui): botão de escanear abre o lote da turma atual"
```

---

### Task 6: Tela da turma (cabeçalho colorido, ⋯, alunos e atividades)

**Files:**
- Modify: `src/app/(app)/turmas/[turmaId]/page.tsx`, `src/components/turma/AcoesTurma.tsx`, `src/components/turma/AbaAlunos.tsx`, `src/components/turma/AdicionarAlunos.tsx`, `src/components/turma/AbaAtividades.tsx`, `tests/e2e/organizacao.spec.ts`, `tests/e2e/menus.spec.ts`

**Interfaces:**
- Consumes: Task 3 (`Cabecalho`, `MenuAcoes`, `AcaoMenu`, `PainelNome`, `ConfirmarApagar`, `Confirmar`, `MenuInferior`, `ItemLista`, `BarraProgresso`, `SeletorCor`, `FormNome`), Task 2 (`definirCorTurma`, `Turma.cor`).
- Produces: ⋯ da turma com rótulo "Ações da turma" e ações "Renomear", "Mudar cor", "Apagar turma"; ⋯ de atividade com rótulo "Ações da atividade {nome}" e ações "Renomear", "Apagar atividade"; botões "Adicionar alunos" e "Nova atividade" que abrem diálogos homônimos.

- [ ] **Step 1: Ajustar os E2E (falhando)**

Em `tests/e2e/organizacao.spec.ts`:

1. No primeiro teste, troque o trecho dos alunos e da atividade (de `await page.getByLabel('Cole um nome por linha')…` até `await expect(page.getByText('0/3 entregues')).toBeVisible();`) por:

```ts
  await page.getByRole('button', { name: 'Adicionar alunos' }).click();
  const adicionar = page.getByRole('dialog', { name: 'Adicionar alunos' });
  await adicionar.getByLabel('Cole um nome por linha').fill('Maria Souza\n\n  João Pedro \nmaria souza\nAna');
  await adicionar.getByRole('button', { name: 'Adicionar', exact: true }).click();
  await expect(adicionar.getByRole('status')).toHaveText('3 adicionados, 1 ignorado');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('link', { name: /João Pedro/ })).toBeVisible();

  await page.getByRole('tab', { name: 'Atividades' }).click();
  await page.getByRole('button', { name: 'Nova atividade' }).click();
  const nova = page.getByRole('dialog', { name: 'Nova atividade' });
  await nova.getByLabel('Nome da atividade').fill('Prova 1');
  await nova.getByRole('button', { name: 'Criar atividade' }).click();
  await expect(page.getByText('0/3 entregues')).toBeVisible();
  await page.getByRole('button', { name: /^Prova 1/ }).click();
  await expect(page.getByRole('link', { name: 'Escanear esta atividade' })).toBeVisible();
```

2. No teste `'apagar turma…'`, troque `await page.getByRole('button', { name: 'Apagar turma' }).click();` por:

```ts
  await page.getByRole('button', { name: 'Ações da turma' }).click();
  await page.getByRole('dialog', { name: '3º B' }).getByRole('button', { name: 'Apagar turma' }).click();
```

3. Acrescente:

```ts
test('mudar a cor da turma pelo ⋯ muda o cartão no Início', async ({ page }) => {
  await entrar(page);
  await criarAnoETurma(page, '3º C', 'Azul');
  await page.getByRole('button', { name: 'Ações da turma' }).click();
  await page.getByRole('dialog', { name: '3º C' }).getByRole('button', { name: 'Mudar cor' }).click();
  await page.getByRole('dialog', { name: 'Cor da turma' }).getByRole('radio', { name: 'Laranja' }).click();
  await abas(page).getByRole('link', { name: 'Início' }).click();
  await expect(page.getByRole('link', { name: /3º C/ })).toHaveAttribute('data-cor', 'laranja');
});
```

Em `tests/e2e/menus.spec.ts`, troque as duas linhas `await page.getByRole('button', { name: 'Apagar turma' }).click();` por:

```ts
  await page.getByRole('button', { name: 'Ações da turma' }).click();
  await page.getByRole('dialog', { name: '3º A' }).getByRole('button', { name: 'Apagar turma' }).click();
```

Run: `npm run test:e2e -- organizacao.spec.ts menus.spec.ts` → Expected: FAIL (não existe "Ações da turma").

- [ ] **Step 2: Página e ações da turma**

`src/app/(app)/turmas/[turmaId]/page.tsx` (substitui):

```tsx
import Link from 'next/link';
import { AbaAlunos } from '@/components/turma/AbaAlunos';
import { AbaAtividades } from '@/components/turma/AbaAtividades';
import { AcoesTurma } from '@/components/turma/AcoesTurma';
import { Cabecalho } from '@/components/ui/Cabecalho';
import { listarAlunos } from '@/lib/dados/alunos';
import { entregasDaTurma, listarAtividades } from '@/lib/dados/atividades';
import { obterTurma } from '@/lib/dados/turmas';
import { clienteServidor } from '@/lib/supabase/servidor';

type Props = { params: Promise<{ turmaId: string }>; searchParams: Promise<{ aba?: string }> };

export default async function PaginaTurma({ params, searchParams }: Props) {
  const { turmaId } = await params;
  const { aba = 'alunos' } = await searchParams;
  const sb = await clienteServidor();
  const turma = await obterTurma(sb, turmaId);
  const [alunos, atividades, entregas] = await Promise.all([
    listarAlunos(sb, turmaId),
    listarAtividades(sb, turmaId),
    entregasDaTurma(sb, turmaId),
  ]);
  const naAtividades = aba === 'atividades';
  const classeAba = (ativa: boolean) =>
    `border-b-[3px] pb-2 ${ativa ? 'border-white font-semibold' : 'border-transparent text-white/80'}`;

  return (
    <div>
      <Cabecalho
        cor={turma.cor}
        voltar={{ href: `/anos/${turma.ano_letivo_id}`, rotulo: String(turma.anos_letivos.ano) }}
        titulo={turma.nome}
        subtitulo={`${alunos.length} alunos · ${atividades.length} atividades`}
        acoes={<AcoesTurma turma={turma} />}
      >
        <div role="tablist" className="mt-3 flex gap-6 text-sm">
          <Link role="tab" aria-selected={!naAtividades} href="?aba=alunos" className={classeAba(!naAtividades)}>Alunos</Link>
          <Link role="tab" aria-selected={naAtividades} href="?aba=atividades" className={classeAba(naAtividades)}>Atividades</Link>
        </div>
      </Cabecalho>
      {naAtividades ? (
        <AbaAtividades turmaId={turmaId} atividades={atividades} alunos={alunos} entregas={entregas} />
      ) : (
        <AbaAlunos turmaId={turmaId} alunos={alunos} />
      )}
    </div>
  );
}
```

`src/components/turma/AcoesTurma.tsx` (substitui):

```tsx
'use client';

import { Palette, Pencil, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ConfirmarApagar } from '@/components/ui/ConfirmarApagar';
import { MenuAcoes } from '@/components/ui/MenuAcoes';
import { MenuInferior } from '@/components/ui/MenuInferior';
import { PainelNome } from '@/components/ui/PainelNome';
import { SeletorCor } from '@/components/ui/SeletorCor';
import { definirCorTurma, renomearTurma } from '@/lib/dados/turmas';
import { mensagemErro } from '@/lib/mensagemErro';
import { clienteNavegador } from '@/lib/supabase/navegador';
import type { Turma } from '@/lib/tipos';

function PainelCor({ turma, onFechar }: { turma: Turma; onFechar: () => void }) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  return (
    <MenuInferior aberto titulo="Cor da turma" onFechar={onFechar}>
      <SeletorCor
        valor={turma.cor}
        onMudar={async (cor) => {
          setErro(null);
          try {
            await definirCorTurma(clienteNavegador(), turma.id, cor);
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

export function AcoesTurma({ turma }: { turma: Turma }) {
  const router = useRouter();
  const [painel, setPainel] = useState<null | 'renomear' | 'cor' | 'apagar'>(null);
  const fechar = () => setPainel(null);
  return (
    <>
      <MenuAcoes
        claro
        titulo={turma.nome}
        rotuloBotao="Ações da turma"
        acoes={[
          { rotulo: 'Renomear', icone: Pencil, aoEscolher: () => setPainel('renomear') },
          { rotulo: 'Mudar cor', icone: Palette, aoEscolher: () => setPainel('cor') },
          { rotulo: 'Apagar turma', icone: Trash2, perigoso: true, aoEscolher: () => setPainel('apagar') },
        ]}
      />
      {painel === 'renomear' && (
        <PainelNome
          titulo="Renomear turma"
          rotulo="Nome da turma"
          textoBotao="Salvar"
          inicial={turma.nome}
          onFechar={fechar}
          onSalvar={async (nome) => {
            await renomearTurma(clienteNavegador(), turma.id, nome);
            router.refresh();
          }}
        />
      )}
      {painel === 'cor' && <PainelCor turma={turma} onFechar={fechar} />}
      {painel === 'apagar' && (
        <ConfirmarApagar
          escopo={{ tipo: 'turma', id: turma.id }}
          descricao={`a turma ${turma.nome}`}
          depois={`/anos/${turma.ano_letivo_id}`}
          onFechar={fechar}
        />
      )}
    </>
  );
}
```

- [ ] **Step 3: Aba Alunos**

`src/components/turma/AdicionarAlunos.tsx` (substitui; mantém o parser e a mensagem):

```tsx
'use client';

import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { MenuInferior } from '@/components/ui/MenuInferior';
import { criarAlunos } from '@/lib/dados/alunos';
import { parseNomes } from '@/lib/dominio/nomes';
import { mensagemErro } from '@/lib/mensagemErro';
import { clienteNavegador } from '@/lib/supabase/navegador';

const plural = (n: number, palavra: string) => `${n} ${palavra}${n === 1 ? '' : 's'}`;

export function AdicionarAlunos({ turmaId, existentes }: { turmaId: string; existentes: string[] }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState('');
  const [resultado, setResultado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function adicionar() {
    const { novos, ignorados } = parseNomes(texto, existentes);
    setOcupado(true);
    setErro(null);
    try {
      await criarAlunos(clienteNavegador(), turmaId, novos);
      setTexto('');
      setResultado(`${plural(novos.length, 'adicionado')}, ${plural(ignorados, 'ignorado')}`);
      router.refresh();
    } catch (e) {
      setErro(mensagemErro(e));
    } finally {
      setOcupado(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setResultado(null);
          setAberto(true);
        }}
        className="inline-flex h-11 items-center gap-1 font-medium text-blue-600"
      >
        <Plus aria-hidden className="h-5 w-5" />
        Adicionar alunos
      </button>
      <MenuInferior aberto={aberto} titulo="Adicionar alunos" onFechar={() => setAberto(false)}>
        <div className="space-y-3">
          <label htmlFor="nomes" className="block text-sm">Cole um nome por linha</label>
          <textarea id="nomes" rows={6} autoFocus value={texto} onChange={(e) => setTexto(e.target.value)} className="w-full rounded-xl border border-slate-200 p-3" />
          {resultado && <p role="status" className="text-sm text-green-700">{resultado}</p>}
          {erro && <p role="alert" className="text-sm text-red-600">{erro}</p>}
          <button
            type="button"
            onClick={adicionar}
            disabled={ocupado || !texto.trim()}
            className="h-12 w-full rounded-xl bg-blue-600 font-medium text-white disabled:opacity-50"
          >
            Adicionar
          </button>
        </div>
      </MenuInferior>
    </>
  );
}
```

`src/components/turma/AbaAlunos.tsx` (substitui):

```tsx
import { ItemLista } from '@/components/ui/ItemLista';
import type { AlunoComContagem } from '@/lib/tipos';
import { AdicionarAlunos } from './AdicionarAlunos';

export function AbaAlunos({ turmaId, alunos }: { turmaId: string; alunos: AlunoComContagem[] }) {
  return (
    <div className="space-y-2">
      <AdicionarAlunos turmaId={turmaId} existentes={alunos.map((a) => a.nome)} />
      {alunos.length === 0 ? (
        <p className="text-sm text-slate-500">Nenhum aluno ainda.</p>
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {alunos.map((a) => (
            <li key={a.id}>
              <ItemLista href={`/alunos/${a.id}`} titulo={a.nome} detalhe={`${a.total_arquivos} arq.`} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Aba Atividades**

`src/components/turma/AbaAtividades.tsx` (substitui):

```tsx
'use client';

import { Camera, Pencil, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { BarraProgresso } from '@/components/ui/BarraProgresso';
import { Confirmar } from '@/components/ui/Confirmar';
import { FormNome } from '@/components/ui/FormNome';
import { MenuAcoes } from '@/components/ui/MenuAcoes';
import { MenuInferior } from '@/components/ui/MenuInferior';
import { PainelNome } from '@/components/ui/PainelNome';
import { apagarAtividade, criarAtividade, renomearAtividade } from '@/lib/dados/atividades';
import { calcularEntregas } from '@/lib/dominio/entregas';
import { formatarData } from '@/lib/dominio/formato';
import { mensagemErro } from '@/lib/mensagemErro';
import { clienteNavegador } from '@/lib/supabase/navegador';
import type { Aluno, Atividade } from '@/lib/tipos';

type Props = { turmaId: string; atividades: Atividade[]; alunos: Aluno[]; entregas: Record<string, string[]> };

function NovaAtividade({ turmaId, onFechar }: { turmaId: string; onFechar: () => void }) {
  const router = useRouter();
  const [data, setData] = useState('');
  return (
    <MenuInferior aberto titulo="Nova atividade" onFechar={onFechar}>
      <div className="space-y-3">
        <FormNome
          rotulo="Nome da atividade"
          textoBotao="Criar atividade"
          autoFocus
          onSalvar={async (nome) => {
            await criarAtividade(clienteNavegador(), turmaId, nome, data || null);
            onFechar();
            router.refresh();
          }}
        />
        <label className="block text-sm">
          Data (opcional)
          <input type="date" value={data} onChange={(e) => setData(e.target.value)} className="mt-1 h-12 w-full rounded-xl border border-slate-200 px-3" />
        </label>
      </div>
    </MenuInferior>
  );
}

function ApagarAtividade({ atividade, onFechar }: { atividade: Atividade; onFechar: () => void }) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  return (
    <Confirmar
      titulo={`Apagar a atividade ${atividade.nome}?`}
      mensagem="Os arquivos continuam nas pastas dos alunos, em “Outros”."
      textoConfirmar="Apagar"
      ocupado={ocupado}
      erro={erro}
      onCancelar={onFechar}
      onConfirmar={async () => {
        setOcupado(true);
        setErro(null);
        try {
          await apagarAtividade(clienteNavegador(), atividade.id);
          onFechar();
          router.refresh();
        } catch (e) {
          setErro(mensagemErro(e));
        } finally {
          setOcupado(false);
        }
      }}
    />
  );
}

function CartaoAtividade({ atividade, alunos, entregues }: { atividade: Atividade; alunos: Aluno[]; entregues: Set<string> }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [painel, setPainel] = useState<null | 'renomear' | 'apagar'>(null);
  const { entregues: ok, faltam } = calcularEntregas(alunos, entregues);

  return (
    <li className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex items-start gap-1">
        <button type="button" aria-expanded={aberto} onClick={() => setAberto((a) => !a)} className="min-w-0 flex-1 text-left">
          <span className="flex justify-between gap-2">
            <span className="truncate font-semibold">{atividade.nome}</span>
            {atividade.data && <span className="shrink-0 text-sm text-slate-500">{formatarData(atividade.data)}</span>}
          </span>
          <span className="mt-2 block">
            <BarraProgresso valor={ok.length} total={alunos.length} />
          </span>
        </button>
        <MenuAcoes
          titulo={atividade.nome}
          rotuloBotao={`Ações da atividade ${atividade.nome}`}
          acoes={[
            { rotulo: 'Renomear', icone: Pencil, aoEscolher: () => setPainel('renomear') },
            { rotulo: 'Apagar atividade', icone: Trash2, perigoso: true, aoEscolher: () => setPainel('apagar') },
          ]}
        />
      </div>
      {aberto && (
        <div className="mt-3 space-y-3 border-t border-slate-100 pt-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="min-w-0">
              <h4 className="font-medium">Faltam ({faltam.length})</h4>
              <ul>{faltam.map((a) => <li key={a.id} className="truncate">{a.nome}</li>)}</ul>
            </div>
            <div className="min-w-0">
              <h4 className="font-medium">Entregaram ({ok.length})</h4>
              <ul>{ok.map((a) => <li key={a.id} className="truncate">{a.nome}</li>)}</ul>
            </div>
          </div>
          <Link href={`/lote/${atividade.id}`} className="flex h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 font-medium text-white">
            <Camera aria-hidden className="h-5 w-5" />
            Escanear esta atividade
          </Link>
        </div>
      )}
      {painel === 'renomear' && (
        <PainelNome
          titulo="Renomear atividade"
          rotulo="Nome da atividade"
          textoBotao="Salvar"
          inicial={atividade.nome}
          onFechar={() => setPainel(null)}
          onSalvar={async (nome) => {
            await renomearAtividade(clienteNavegador(), atividade.id, nome);
            router.refresh();
          }}
        />
      )}
      {painel === 'apagar' && <ApagarAtividade atividade={atividade} onFechar={() => setPainel(null)} />}
    </li>
  );
}

export function AbaAtividades({ turmaId, atividades, alunos, entregas }: Props) {
  const [nova, setNova] = useState(false);
  return (
    <div className="space-y-2">
      <button type="button" onClick={() => setNova(true)} className="inline-flex h-11 items-center gap-1 font-medium text-blue-600">
        <Plus aria-hidden className="h-5 w-5" />
        Nova atividade
      </button>
      {nova && <NovaAtividade turmaId={turmaId} onFechar={() => setNova(false)} />}
      {atividades.length === 0 && <p className="text-sm text-slate-500">Nenhuma atividade ainda.</p>}
      <ul className="space-y-2">
        {atividades.map((at) => (
          <CartaoAtividade key={at.id} atividade={at} alunos={alunos} entregues={new Set(entregas[at.id] ?? [])} />
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npm exec -- tsc --noEmit && npm run lint && npm run test:e2e -- organizacao.spec.ts menus.spec.ts escanear-contexto.spec.ts navegacao.spec.ts`
Expected: tudo PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(ui): turma com cabeçalho colorido, menu de ações e progresso de entregas"
```

---

### Task 7: Pasta do aluno (⋯ do aluno e do arquivo)

**Files:**
- Modify: `src/lib/tipos.ts` (`AlunoDetalhe.turmas.cor`), `src/lib/dados/alunos.ts` (`obterAluno` seleciona `cor`), `src/app/(app)/alunos/[alunoId]/page.tsx`, `src/components/aluno/AcoesAluno.tsx`, `src/components/aluno/ListaArquivos.tsx`, `tests/e2e/aluno.spec.ts`, `tests/e2e/envio.spec.ts`

**Interfaces:**
- Consumes: Task 3 (`Cabecalho`, `EtiquetaTurma`, `MenuAcoes`, `PainelNome`, `ConfirmarApagar`, `MenuInferior`, `BuscarAluno`).
- Produces: ⋯ do aluno "Ações do aluno" (Renomear, Enviar arquivo, Apagar aluno); cartão de arquivo cujo link principal abre o PDF; ⋯ do arquivo "Ações do arquivo" (Baixar, Renomear, Mover para outro aluno, Apagar).

- [ ] **Step 1: Ajustar os E2E (falhando)**

`tests/e2e/aluno.spec.ts`, troque o primeiro teste por:

```ts
test('abrir, renomear, mover e apagar arquivo pelo ⋯', async ({ page }) => {
  const sb = await clienteLogado();
  const s = await semear(sb);
  const arq = await criarArquivo(sb, s.alunos.maria, s.atividadeId, 'Prova 1');

  await entrar(page);
  await page.goto(`/alunos/${s.alunos.maria}`);
  const cartao = page.getByTestId('arquivo');
  await expect(cartao.getByRole('link', { name: /Prova 1/ })).toHaveAttribute('href', `/arquivos/${arq.id}`);

  const resposta = await page.request.get(`/arquivos/${arq.id}`);
  expect(resposta.status()).toBe(200);
  expect(resposta.headers()['content-type']).toContain('pdf');

  await cartao.getByRole('button', { name: 'Ações do arquivo' }).click();
  await page.getByRole('dialog', { name: 'Prova 1', exact: true }).getByRole('button', { name: 'Renomear' }).click();
  const renomear = page.getByRole('dialog', { name: 'Renomear arquivo' });
  await renomear.getByLabel('Novo nome').fill('Prova 1 - refeita');
  await renomear.getByRole('button', { name: 'Salvar' }).click();
  await expect(cartao).toContainText('Prova 1 - refeita');

  await cartao.getByRole('button', { name: 'Ações do arquivo' }).click();
  await page.getByRole('dialog', { name: 'Prova 1 - refeita' }).getByRole('button', { name: 'Mover para outro aluno' }).click();
  const mover = page.getByRole('dialog', { name: 'Mover para qual aluno?' });
  await mover.getByLabel('Nome do aluno').fill('joao');
  await mover.getByRole('button', { name: /João Pedro/ }).click();
  await expect(page.getByText('Nenhum arquivo ainda.')).toBeVisible();

  await page.goto(`/alunos/${s.alunos.joao}`);
  await page.getByTestId('arquivo').getByRole('button', { name: 'Ações do arquivo' }).click();
  await page.getByRole('dialog', { name: 'Prova 1 - refeita' }).getByRole('button', { name: 'Apagar', exact: true }).click();
  await page.getByRole('dialog', { name: /^Apagar/ }).getByRole('button', { name: 'Apagar' }).click();
  await expect(page.getByText('Nenhum arquivo ainda.')).toBeVisible();
  expect(await contarArquivosDe(s.alunos.joao)).toBe(0);
});

test('renomear o aluno pelo ⋯ e ver a etiqueta da turma', async ({ page }) => {
  const s = await semear(await clienteLogado());
  await entrar(page);
  await page.goto(`/alunos/${s.alunos.maria}`);
  await expect(page.getByText('3º A · 2026')).toBeVisible();
  await page.getByRole('button', { name: 'Ações do aluno' }).click();
  await page.getByRole('dialog', { name: 'Maria Souza' }).getByRole('button', { name: 'Renomear' }).click();
  const painel = page.getByRole('dialog', { name: 'Renomear aluno' });
  await painel.getByLabel('Nome do aluno').fill('Maria S. Lima');
  await painel.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByRole('heading', { name: 'Maria S. Lima' })).toBeVisible();
});
```

`tests/e2e/envio.spec.ts`, no `beforeEach`, troque `await page.getByRole('link', { name: 'Enviar arquivo' }).click();` por:

```ts
  await page.getByRole('button', { name: 'Ações do aluno' }).click();
  await page.getByRole('dialog', { name: 'Maria Souza' }).getByRole('button', { name: 'Enviar arquivo' }).click();
  await expect(page).toHaveURL(`/alunos/${s.alunos.maria}/enviar`);
```

Run: `npm run test:e2e -- aluno.spec.ts envio.spec.ts` → Expected: FAIL (não existe "Ações do arquivo"/"Ações do aluno").

- [ ] **Step 2: Cor na consulta do aluno**

Em `src/lib/tipos.ts`, `AlunoDetalhe.turmas` ganha `cor: CorTurma`. Em `src/lib/dados/alunos.ts`, `obterAluno` passa a selecionar `turmas(id,nome,cor,ano_letivo_id,anos_letivos(ano))`.

- [ ] **Step 3: Página e ⋯ do aluno**

`src/app/(app)/alunos/[alunoId]/page.tsx` (substitui):

```tsx
import { AcoesAluno } from '@/components/aluno/AcoesAluno';
import { ListaArquivos } from '@/components/aluno/ListaArquivos';
import { Cabecalho } from '@/components/ui/Cabecalho';
import { EtiquetaTurma } from '@/components/ui/EtiquetaTurma';
import { obterAluno } from '@/lib/dados/alunos';
import { listarArquivosDoAluno } from '@/lib/dados/arquivos';
import { listarAtividades } from '@/lib/dados/atividades';
import { agruparPorAtividade } from '@/lib/dominio/agrupar';
import { clienteServidor } from '@/lib/supabase/servidor';

export default async function PaginaAluno({ params }: { params: Promise<{ alunoId: string }> }) {
  const { alunoId } = await params;
  const sb = await clienteServidor();
  const aluno = await obterAluno(sb, alunoId);
  const [arquivos, atividades] = await Promise.all([
    listarArquivosDoAluno(sb, alunoId),
    listarAtividades(sb, aluno.turma_id),
  ]);

  return (
    <div>
      <Cabecalho
        voltar={{ href: `/turmas/${aluno.turma_id}`, rotulo: aluno.turmas.nome }}
        titulo={aluno.nome}
        subtitulo={
          <span className="flex flex-wrap items-center gap-2">
            <EtiquetaTurma cor={aluno.turmas.cor} texto={`${aluno.turmas.nome} · ${aluno.turmas.anos_letivos.ano}`} />
            <span>{arquivos.length} trabalho(s)</span>
          </span>
        }
        acoes={<AcoesAluno aluno={{ id: aluno.id, turma_id: aluno.turma_id, nome: aluno.nome }} />}
      />
      <ListaArquivos grupos={agruparPorAtividade(arquivos, atividades)} alunoId={alunoId} />
    </div>
  );
}
```

`src/components/aluno/AcoesAluno.tsx` (substitui):

```tsx
'use client';

import { FileUp, Pencil, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ConfirmarApagar } from '@/components/ui/ConfirmarApagar';
import { MenuAcoes } from '@/components/ui/MenuAcoes';
import { PainelNome } from '@/components/ui/PainelNome';
import { renomearAluno } from '@/lib/dados/alunos';
import { clienteNavegador } from '@/lib/supabase/navegador';
import type { Aluno } from '@/lib/tipos';

export function AcoesAluno({ aluno }: { aluno: Aluno }) {
  const router = useRouter();
  const [painel, setPainel] = useState<null | 'renomear' | 'apagar'>(null);
  return (
    <>
      <MenuAcoes
        titulo={aluno.nome}
        rotuloBotao="Ações do aluno"
        acoes={[
          { rotulo: 'Renomear', icone: Pencil, aoEscolher: () => setPainel('renomear') },
          { rotulo: 'Enviar arquivo', icone: FileUp, aoEscolher: () => router.push(`/alunos/${aluno.id}/enviar`) },
          { rotulo: 'Apagar aluno', icone: Trash2, perigoso: true, aoEscolher: () => setPainel('apagar') },
        ]}
      />
      {painel === 'renomear' && (
        <PainelNome
          titulo="Renomear aluno"
          rotulo="Nome do aluno"
          textoBotao="Salvar"
          inicial={aluno.nome}
          onFechar={() => setPainel(null)}
          onSalvar={async (nome) => {
            await renomearAluno(clienteNavegador(), aluno.id, nome);
            router.refresh();
          }}
        />
      )}
      {painel === 'apagar' && (
        <ConfirmarApagar
          escopo={{ tipo: 'aluno', id: aluno.id }}
          descricao={aluno.nome}
          depois={`/turmas/${aluno.turma_id}`}
          onFechar={() => setPainel(null)}
        />
      )}
    </>
  );
}
```

- [ ] **Step 4: Lista de arquivos**

`src/components/aluno/ListaArquivos.tsx` (substitui):

```tsx
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
          { rotulo: 'Baixar', icone: Download, aoEscolher: () => window.location.assign(`/arquivos/${arquivo.id}?download=1`) },
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
```

Atenção: `envio.spec.ts` procura `getByRole('heading', { name: 'Prova 1' })` e `{ name: 'Outros' }` — o `h2` do grupo continua com o texto do título (o `uppercase` é só CSS).

- [ ] **Step 5: Rodar e ver passar**

Run: `npm exec -- tsc --noEmit && npm run lint && npm run test:e2e -- aluno.spec.ts envio.spec.ts scanner.spec.ts escanear-contexto.spec.ts`
Expected: tudo PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(ui): pasta do aluno com etiqueta da turma e ações no menu ⋯"
```

---

### Task 8: Ano, Lote, Enviar e Compartilhar no visual novo; limpeza; suíte completa

**Files:**
- Modify: `src/app/(app)/anos/[anoId]/page.tsx`, `src/components/ano/AcoesAno.tsx`, `src/app/(app)/lote/page.tsx`, `src/components/lote/EscolherLote.tsx` (classes), `src/app/(app)/alunos/[alunoId]/enviar/page.tsx`, `src/components/envio/EnviarArquivos.tsx` (remove o `h1` próprio; classes), `src/components/envio/EscolherDestino.tsx` (classes), `src/app/(app)/compartilhar/page.tsx`, `tests/e2e/organizacao.spec.ts`
- Delete: `src/components/ui/Renomear.tsx`, `src/components/ui/BotaoApagar.tsx`

**Interfaces:**
- Consumes: Task 3 (`Cabecalho`, `MenuAcoes`, `ConfirmarApagar`, `CartaoTurma`), Task 2 (`listarTurmasComContagem`), Task 4 (`NovaTurma`).
- Produces: ⋯ do ano "Ações do ano" (Arquivar ano / Desarquivar ano, Apagar ano).

- [ ] **Step 1: E2E do ano (falhando)**

Acrescente a `tests/e2e/organizacao.spec.ts`:

```ts
test('arquivar o ano pelo ⋯', async ({ page }) => {
  await entrar(page);
  await abas(page).getByRole('link', { name: 'Mais' }).click();
  await page.getByLabel('Ano', { exact: true }).fill('2026');
  await page.getByRole('button', { name: 'Criar ano' }).click();
  await page.getByRole('link', { name: '2026' }).click();
  await page.getByRole('button', { name: 'Ações do ano' }).click();
  await page.getByRole('dialog', { name: '2026' }).getByRole('button', { name: 'Arquivar ano' }).click();
  await expect(page.getByText('Ano arquivado')).toBeVisible();
});
```

Run: `npm run test:e2e -- organizacao.spec.ts` → Expected: o novo teste FALHA.

- [ ] **Step 2: Ano**

`src/components/ano/AcoesAno.tsx` (substitui):

```tsx
'use client';

import { Archive, ArchiveRestore, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ConfirmarApagar } from '@/components/ui/ConfirmarApagar';
import { MenuAcoes } from '@/components/ui/MenuAcoes';
import { definirArquivado } from '@/lib/dados/anos';
import { mensagemErro } from '@/lib/mensagemErro';
import { clienteNavegador } from '@/lib/supabase/navegador';
import type { AnoLetivo } from '@/lib/tipos';

export function AcoesAno({ ano }: { ano: AnoLetivo }) {
  const router = useRouter();
  const [apagando, setApagando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function alternarArquivado() {
    setErro(null);
    try {
      await definirArquivado(clienteNavegador(), ano.id, !ano.arquivado);
      router.refresh();
    } catch (e) {
      setErro(mensagemErro(e));
    }
  }

  return (
    <>
      <MenuAcoes
        titulo={String(ano.ano)}
        rotuloBotao="Ações do ano"
        acoes={[
          ano.arquivado
            ? { rotulo: 'Desarquivar ano', icone: ArchiveRestore, aoEscolher: alternarArquivado }
            : { rotulo: 'Arquivar ano', icone: Archive, aoEscolher: alternarArquivado },
          { rotulo: 'Apagar ano', icone: Trash2, perigoso: true, aoEscolher: () => setApagando(true) },
        ]}
      />
      {erro && <p role="alert" className="text-sm text-red-600">{erro}</p>}
      {apagando && (
        <ConfirmarApagar escopo={{ tipo: 'ano', id: ano.id }} descricao={`o ano ${ano.ano}`} depois="/mais" onFechar={() => setApagando(false)} />
      )}
    </>
  );
}
```

`src/app/(app)/anos/[anoId]/page.tsx` (substitui):

```tsx
import { AcoesAno } from '@/components/ano/AcoesAno';
import { NovaTurma } from '@/components/turma/NovaTurma';
import { Cabecalho } from '@/components/ui/Cabecalho';
import { CartaoTurma } from '@/components/ui/CartaoTurma';
import { obterAno } from '@/lib/dados/anos';
import { listarTurmasComContagem } from '@/lib/dados/turmas';
import { clienteServidor } from '@/lib/supabase/servidor';

export default async function PaginaAno({ params }: { params: Promise<{ anoId: string }> }) {
  const { anoId } = await params;
  const sb = await clienteServidor();
  const [ano, turmas] = await Promise.all([obterAno(sb, anoId), listarTurmasComContagem(sb, anoId)]);

  return (
    <div className="space-y-4">
      <Cabecalho
        voltar={{ href: '/mais', rotulo: 'Mais' }}
        titulo={String(ano.ano)}
        subtitulo={ano.arquivado ? 'Ano arquivado' : `${turmas.length} turmas`}
        acoes={<AcoesAno ano={ano} />}
      />
      <div className="flex justify-end">
        <NovaTurma anoId={anoId} coresUsadas={turmas.map((t) => t.cor)} />
      </div>
      {turmas.length ? (
        <div className="grid grid-cols-2 gap-3">
          {turmas.map((t) => <CartaoTurma key={t.id} turma={t} />)}
        </div>
      ) : (
        <p className="text-sm text-slate-500">Nenhuma turma ainda.</p>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Lote, Enviar e Compartilhar**

`src/app/(app)/lote/page.tsx`: troque o `nav` e o `h1` por `<Cabecalho voltar={{ href: '/', rotulo: 'Início' }} titulo="Escanear lote" />` (import de `@/components/ui/Cabecalho`; remova o import de `Link` se ficar sem uso).

`src/app/(app)/alunos/[alunoId]/enviar/page.tsx`: troque o `nav` por `<Cabecalho voltar={{ href: \`/alunos/${alunoId}\`, rotulo: aluno.nome }} titulo="Enviar arquivo" subtitulo={\`Para ${aluno.nome}\`} />`.

`src/components/envio/EnviarArquivos.tsx`: remova a linha `<h1 …>Enviar arquivo para {aluno.nome}</h1>` (o cabeçalho agora vem da página). Classes: input de arquivo dentro de um bloco `rounded-xl border border-dashed border-slate-300 bg-white p-4`.

`src/components/envio/EscolherDestino.tsx` e `src/components/lote/EscolherLote.tsx`: selects/inputs com `h-12 w-full rounded-xl border border-slate-200 bg-white px-3`; botões primários `h-12 w-full rounded-xl bg-blue-600 font-medium text-white disabled:opacity-50`. Não mude rótulos nem textos.

`src/app/(app)/compartilhar/page.tsx`: na etapa sem aluno, troque o `h1` por `<Cabecalho titulo="Arquivos recebidos" subtitulo={\`${arquivos.length} arquivo(s)\`} />`; na etapa final, envolva o `EnviarArquivos` com `<><Cabecalho titulo="Enviar arquivo" subtitulo={\`Para ${aluno.nome}\`} />…</>`.

- [ ] **Step 4: Limpeza**

```bash
git rm src/components/ui/Renomear.tsx src/components/ui/BotaoApagar.tsx
grep -rn "Renomear'\|BotaoApagar\|text-gray-\|bg-gray-\|rounded border" src || echo "limpo"
```

Expected: `limpo`. Se aparecer algum uso, migre-o para os componentes novos (`PainelNome`/`ConfirmarApagar`) e para as classes `slate`/`rounded-xl`.

- [ ] **Step 5: Suíte completa**

Run: `npm test && npm run test:int && npm run test:db && npm exec -- tsc --noEmit && npm run lint && npm run build && npm run test:e2e`
Expected: tudo PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(ui): ano, lote, envio e compartilhar no visual novo; remove componentes antigos"
```

- [ ] **Step 7: Banco de produção (controlador, com confirmação do usuário)**

Não é tarefa do subagente. O controlador pede confirmação ao usuário e aplica `supabase/migrations/20261015000000_cor_turma.sql` no projeto de produção (`dgusnkaszqzwjalqojlp`) via MCP do Supabase **antes** de juntar a branch na `main` (o deploy da Vercel depende da coluna `cor`). Depois roda `get_advisors` (security) e confirma que não há alertas novos.
