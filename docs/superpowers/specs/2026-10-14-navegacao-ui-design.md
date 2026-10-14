# Navegação e UI — Design

Data: 2026-10-14
Status: aprovado em conversa, aguardando revisão da spec
Base: app existente (spec `2026-10-14-organizador-trabalhos-design.md`)

## 1. Objetivo

Melhorar navegação e visual do app para uso **principalmente no celular**:

- **Menos cliques** para chegar a um aluno ou começar a escanear.
- **Saber onde estou** (ano/turma/aluno) e como voltar.
- **Visual com cara de app**, estilo vibrante (inspiração: Google Classroom), em vez do esqueleto atual.

**Sucesso:** do Início, abrir uma turma do ano atual em 1 toque; começar a escanear para o aluno/turma em que estou em 1 toque; o caminho atual está sempre visível.

**Fora do escopo:** modo escuro (app segue sempre claro), animações elaboradas, sidebar para desktop, busca por título de arquivo, novos ícones do app. Scanner, fila de envio, RLS e regras de negócio não mudam.

## 2. Abordagem

Kit de componentes próprio com Tailwind + ícones `lucide-react` (única dependência nova). Menus inferiores usam o elemento nativo `<dialog>`.

## 3. Estilo visual

- Fundo `slate-50`, superfícies brancas com borda `slate-200`, cantos arredondados (`rounded-xl`), texto `slate-900`/`slate-500`.
- Cor de destaque: azul `blue-600`.
- Cada turma tem uma cor da **paleta fixa de 8** (`src/lib/ui/cores.ts`): `azul`, `verde`, `laranja`, `roxo`, `rosa`, `ciano`, `ambar`, `vermelho`. Cada entrada define classes Tailwind de fundo forte (cartão/cabeçalho), fundo suave (etiqueta) e texto.
- Emojis da UI são substituídos por ícones `lucide-react`.
- Alvos de toque ≥ 44 px. Respeitar `env(safe-area-inset-bottom)` na barra de abas.

## 4. Mapa de navegação

Barra de abas fixa embaixo (`BarraAbas`), oculta em `/login` e no scanner em tela cheia (`/alunos/[id]/escanear`, `/lote/[atividadeId]`):

| Aba | Rota | Conteúdo |
|---|---|---|
| Início | `/` | Saudação; seletor de ano; campo de busca (leva a `/buscar`); grade de **cartões coloridos das turmas** do ano selecionado (nome, nº de alunos); **Recentes** (últimos 5 arquivos: título, aluno, turma, data — toque abre a pasta do aluno) |
| Turmas | `/turmas` | Turmas agrupadas por ano (ano selecionado expandido, demais recolhidos; arquivados por último), botão "Nova turma" (no ano selecionado) |
| 📷 (central) | — | Botão contextual (seção 6) |
| Buscar | `/buscar` | Campo com foco automático; resultados de alunos (nome, etiqueta da turma, ano) |
| Mais | `/mais` | Anos letivos (criar, arquivar/desarquivar, apagar — links para `/anos/[id]`), uso do armazenamento, Sair |

A aba ativa é destacada conforme a rota: `/` → Início; `/turmas*`, `/anos*`, `/alunos*` (exceto escanear) → Turmas; `/buscar` → Buscar; `/mais` → Mais.

**Faixa de envios pendentes** (StatusFila) passa a ser uma faixa compacta logo acima da barra de abas; tocar expande a lista (tentar de novo / descartar).

## 5. Telas

**Cabeçalho das telas internas** (`Cabecalho`): linha com "‹ <nível acima>" (link) e botão **⋯** (`MenuAcoes`); título grande; subtítulo; faixa de cor opcional.

- **Turma (`/turmas/[id]`)**: cabeçalho com fundo na cor da turma, "‹ <ano>", subtítulo "N alunos · M atividades", abas internas Alunos | Atividades.
  - ⋯: Renomear, Mudar cor (`SeletorCor`), Apagar turma.
  - Alunos: lista (`ItemLista`) com nº de arquivos; "＋ Adicionar alunos" abre `MenuInferior` com o campo de colar nomes.
  - Atividades: cada atividade com `BarraProgresso` (entregues/total) e data; tocar expande "Faltam / Entregaram" + botão "Escanear esta atividade" (`/lote/[atividadeId]`) + ⋯ (renomear, apagar). "＋ Nova atividade" no topo.
- **Aluno (`/alunos/[id]`)**: cabeçalho branco, "‹ <turma>", nome, `EtiquetaTurma` (cor da turma, "3º A · 2026"), "N trabalhos".
  - ⋯ do aluno: Renomear, Enviar arquivo, Apagar aluno.
  - Arquivos agrupados por atividade; cartão com miniatura, título, data, páginas; **tocar no cartão abre o PDF**; ⋯ do arquivo: Baixar, Renomear, Mover, Apagar.
- **Ano (`/anos/[id]`)**: cabeçalho "‹ Mais"; grade de cartões das turmas do ano; ⋯: Arquivar/Desarquivar, Apagar ano; "Nova turma".
- **Enviar arquivo, Lote (`/lote`), Compartilhar**: ganham `Cabecalho` e o visual novo; lógica inalterada.

## 6. Botão 📷 contextual

Função pura `acaoDoBotao(pathname): Acao` em `src/lib/ui/acaoBotao.ts`:

| Rota | Ação |
|---|---|
| `/alunos/[id]` e subrotas (exceto escanear) | ir para `/alunos/[id]/escanear` |
| `/turmas/[id]` | abrir `MenuInferior` "Escanear lote — 3º A" com as atividades da turma (toque → `/lote/[atividadeId]`) e "＋ Nova atividade" (cria com data de hoje e vai ao lote). Sem atividades: o menu já abre no campo de criar |
| qualquer outra | abrir `MenuInferior` com: Escanear lote (`/lote`), Escanear para um aluno (busca de aluno → `/alunos/[id]/escanear`), Enviar arquivo (busca de aluno → `/alunos/[id]/enviar`) |

`type Acao = { tipo: 'ir'; href: string } | { tipo: 'lote-turma'; turmaId: string } | { tipo: 'menu' }`.

## 7. Dados

Migração nova `supabase/migrations/<timestamp>_cor_turma.sql`:

- `alter table public.turmas add column cor text not null default 'azul' check (cor in ('azul','verde','laranja','roxo','rosa','ciano','ambar','vermelho'))`.
- Preenche turmas existentes: dentro de cada `ano_letivo_id`, cor pela ordem de `criado_em` ciclando a paleta.

Funções novas em `src/lib/dados/`:

- `listarRecentes(sb, limite = 5)`: arquivos mais recentes com `alunos(id,nome,turmas(nome,cor))`.
- `listarTurmasComContagem(sb, anoId)`: turmas do ano com `cor` e contagem de alunos.
- `listarTurmasPorAno(sb)`: todas as turmas com ano (para a aba Turmas).
- `criarTurma` passa a aceitar `cor`; `definirCorTurma(sb, id, cor)`.
- Tipos `Turma`/`TurmaDetalhe` ganham `cor: CorTurma`.

Regra pura `sugerirCor(usadas: CorTurma[]): CorTurma` — primeira cor da paleta não usada no ano; se todas usadas, a menos usada (empate → ordem da paleta).

**Ano selecionado:** cookie `ano_id` (definido pelo seletor de ano no Início, `path=/`, 1 ano). Função pura `escolherAno(anos, cookieId): AnoLetivo | null` — usa o cookie se o ano existir; senão o mais recente não arquivado; senão o mais recente; sem anos → `null` (Início mostra estado vazio com "Criar ano letivo").

## 8. Componentes (`src/components/ui/` salvo indicação)

| Componente | Responsabilidade |
|---|---|
| `BarraAbas` (`src/components/navegacao/`) | 4 abas + botão central; aba ativa por rota; oculta nas rotas listadas na seção 4 |
| `BotaoEscanear` (`src/components/navegacao/`) | aplica `acaoDoBotao`; abre menus |
| `MenuInferior` | `<dialog>` que sobe de baixo; fecha com Esc, toque no fundo ou arrastar para baixo (> 80 px) |
| `MenuAcoes` | botão ⋯ que abre `MenuInferior` com lista de ações (`{ rotulo, icone, perigoso?, aoEscolher }`) |
| `Cabecalho` | voltar, título, subtítulo, ⋯, cor opcional, slot para abas internas |
| `CartaoTurma` | cartão colorido (nome, nº alunos) |
| `ItemLista` | linha tocável com título, detalhe e chevron |
| `BarraProgresso` | barra entregues/total |
| `EtiquetaTurma` | etiqueta com cor suave da turma |
| `SeletorCor` | 8 círculos de cor, selecionado marcado |
| `Confirmar` | passa a renderizar dentro de `MenuInferior`; **props inalteradas** |

Componentes existentes (`FormNome`, `Renomear`, `BotaoApagar`, `BuscarAluno`, `ListaArquivos`, `AbaAtividades`, etc.) são reestilizados; `Renomear`, `BotaoApagar` e "Mover" passam a ser acionados a partir de `MenuAcoes`.

## 9. Erros e casos de borda

| Situação | Comportamento |
|---|---|
| Sem anos letivos | Início mostra estado vazio com botão "Criar ano letivo" |
| Ano sem turmas | Início mostra "Nenhuma turma em 2026" + "Nova turma" |
| Cookie aponta para ano apagado | `escolherAno` ignora e usa o ano ativo |
| 📷 numa turma sem alunos | menu de lote mostra aviso "Adicione alunos primeiro" com atalho |
| Falha ao carregar atividades no menu do 📷 | mensagem no menu + "Tentar de novo" |
| Ações do ⋯ que falham | erro exibido dentro do menu (padrão `role="alert"` existente) |

## 10. Testes

- **Unitários:** `acaoDoBotao` (todas as rotas da tabela), `sugerirCor` (primeira livre, todas usadas → menos usada), `escolherAno` (cookie válido, cookie de ano apagado, sem anos, todos arquivados), aba ativa por rota.
- **Integração:** `listarRecentes`, `listarTurmasComContagem`, `listarTurmasPorAno`, check da coluna `cor` rejeita valor fora da paleta, `definirCorTurma`.
- **pgTAP:** teste existente segue passando; RLS continua cobrindo `turmas`.
- **E2E:** os 15 existentes adaptados aos novos seletores (ações via ⋯). Novos: navegar pelas abas com aba ativa correta; criar turma com cor escolhida e ver o cartão no Início com essa cor; 📷 no aluno abre a câmera dele; 📷 na turma abre menu de atividades e leva ao lote; 📷 no Início abre o menu com 3 opções; trocar ano no Início troca as turmas; fechar `MenuInferior` com Esc; modo escuro do SO continua legível.
- **Manual (celular real):** uso com uma mão, barra de abas com safe-area no iPhone, arrastar menu para fechar.
