# Organizador de Trabalhos — Design

Data: 2026-10-14
Status: aprovado em conversa, aguardando revisão da spec

## 1. Objetivo

App web para um(a) professor(a) organizar os trabalhos escaneados dos alunos em pastas por aluno, e escanear atividades direto do celular enviando-as para a pasta certa.

**Usuário único:** só o(a) professor(a) faz login. Sem cadastro público.

**Sucesso:** escanear e arquivar um trabalho leva poucos segundos; achar o trabalho de qualquer aluno é rápido.

**Fora do escopo:** notas/correção, acesso de alunos ou pais, OCR, reconhecimento do nome do aluno na folha, múltiplos professores, backup automático para Google Drive.

## 2. Stack

- Next.js (App Router, TypeScript) + Tailwind, deploy na Vercel.
- Supabase: Auth (email + senha), Postgres, Storage (bucket privado).
- App instalável como PWA (ícone na tela inicial, Web Share Target para receber arquivos).
- Scanner: `getUserMedia` + OpenCV.js + `jscanify`; PDF gerado no cliente com `pdf-lib`.

## 3. Modelo de dados

```
anos_letivos  (id, user_id, ano int, arquivado bool default false, criado_em)
turmas        (id, user_id, ano_letivo_id → anos_letivos ON DELETE CASCADE, nome, criado_em)
alunos        (id, user_id, turma_id → turmas ON DELETE CASCADE, nome, criado_em)
atividades    (id, user_id, turma_id → turmas ON DELETE CASCADE, nome, data date null, criado_em)
arquivos      (id, user_id, aluno_id → alunos ON DELETE CASCADE,
               atividade_id → atividades ON DELETE SET NULL null,
               titulo text, storage_path text, paginas int,
               tamanho_bytes bigint, criado_em)
```

Regras:
- Atividades pertencem à turma. Arquivo avulso pode usar uma atividade existente ou só um `titulo` livre (`atividade_id` nulo). Quando ligado a uma atividade, `titulo` recebe o nome da atividade no momento do envio.
- Aluno que muda de turma no ano seguinte é recadastrado na nova turma. A busca por nome encontra o aluno em todos os anos.
- Storage: bucket privado `trabalhos`, caminho `{aluno_id}/{arquivo_id}.pdf`. Visualização e download por URL assinada de curta duração (ex.: 5 min).
- Apagar arquivo: remove a linha e o objeto do Storage. Apagar aluno, turma ou ano: confirmação mostrando quantos arquivos serão removidos; a exclusão remove os objetos do Storage antes de apagar as linhas.
- Mover arquivo para outro aluno: atualiza `aluno_id` e move o objeto para o novo caminho; se a atividade não pertencer à turma do novo aluno, `atividade_id` vira nulo e o `titulo` é mantido.

## 4. Segurança

- Cadastro público desligado no Supabase. Usuário criado manualmente no painel.
- RLS habilitado em todas as tabelas: `user_id = auth.uid()` para select, insert, update e delete.
- Políticas do Storage: acesso ao bucket `trabalhos` só para o usuário autenticado dono (checando `owner = auth.uid()`).
- Rotas do app protegidas por middleware: sem sessão, redireciona para `/login`.

## 5. Telas

Mobile-first, também funcionando no desktop.

1. **Login** — email e senha.
2. **Início** — busca global por aluno (resultado mostra ano e turma); lista de anos letivos (mais recente no topo, arquivados recolhidos); botão "Escanear lote"; indicador de uso do storage e fila de envios pendentes.
3. **Ano** — cards das turmas; criar, renomear e apagar turma; arquivar ou desarquivar o ano.
4. **Turma** — duas abas:
   - *Alunos:* lista com a contagem de arquivos; adicionar um aluno ou colar vários nomes (um por linha, ignorando linhas vazias e espaços extras); renomear e apagar.
   - *Atividades:* lista com "X/Y entregues"; ao tocar, mostra quem entregou e quem falta; criar, renomear e apagar.
5. **Aluno (pasta)** — arquivos agrupados por atividade (os sem atividade ficam em "Outros"), com miniatura da 1ª página; ações abrir, baixar, renomear, mover para outro aluno e apagar; botões "Escanear" e "Enviar arquivo".
6. **Scanner** (tela cheia):
   - *Modo avulso:* aluno pré-selecionado; escolhe uma atividade da turma ou digita um título.
   - *Modo lote:* escolhe turma e atividade uma vez. Ciclo: escanear páginas → tocar no aluno (lista esconde quem já tem arquivo nessa atividade) → salvar → scanner reinicia vazio para o próximo.
7. **Enviar arquivo** — aceita PDF ou imagens (JPEG, PNG, HEIC quando o navegador suportar). Imagens viram PDF pelo mesmo pipeline do scanner, sem detecção de bordas. PDF é enviado como está, com limite de 20 MB. Também recebe arquivos pelo "Compartilhar" do celular (PWA Share Target), abrindo a tela de escolha de aluno e atividade.

Miniaturas: geradas no cliente a partir da 1ª página no momento do envio e salvas como `{aluno_id}/{arquivo_id}.thumb.jpg` (~300 px). Para PDFs enviados prontos, a miniatura é renderizada com `pdfjs-dist`; se falhar, mostra um ícone genérico de PDF.

## 6. Pipeline do scanner

1. **Câmera:** câmera traseira via `getUserMedia` (`facingMode: environment`), na maior resolução disponível.
2. **Detecção:** OpenCV.js carregado sob demanda ao abrir o scanner (cache do service worker depois da 1ª vez). `jscanify` detecta a folha a cada ~200 ms e desenha o contorno sobre o vídeo.
3. **Captura:** botão "capturar" ou auto-captura opcional, disparada com o contorno estável por ~1 s. A imagem em resolução cheia é recortada com correção de perspectiva.
4. **Revisão:** fila de miniaturas das páginas. Tocar numa delas abre o ajuste manual dos 4 cantos, girar 90°, apagar ou refazer; arrastar reordena.
5. **Filtro:** "documento" (padrão: tons de cinza, contraste e fundo branco) ou "cor".
6. **PDF:** cada página é redimensionada para ~1600 px no lado maior, salva em JPEG com qualidade 0,7 e montada pelo `pdf-lib` em página A4 (retrato ou paisagem conforme a proporção), centralizada mantendo a proporção. Meta: ~200–400 KB por página.
7. **Envio:** upload direto do navegador para o Supabase Storage (não passa pela função da Vercel, evitando o limite de 4,5 MB) e depois insert em `arquivos`.

## 7. Upload resiliente

- Antes do upload, o PDF, a miniatura e os metadados (aluno, atividade, título, páginas) são gravados no IndexedDB.
- Uma fila processa os itens: upload para o Storage → insert no banco → apagar o item local. O item local só sai da fila depois das duas confirmações.
- Se o Storage aceitar e o banco falhar, o objeto órfão é apagado e o item volta para a fila.
- Nova tentativa automática no evento `online` e ao abrir o app; botão manual "tentar de novo". O início mostra "N envios pendentes".
- Sessão expirada: a fila fica parada até o novo login e então retoma.

## 8. Erros e casos de borda

| Situação | Comportamento |
|---|---|
| Permissão de câmera negada ou sem câmera | Mensagem explicando como liberar + atalho para "Enviar arquivo" |
| OpenCV não carrega | Scanner funciona sem detecção; recorte manual pelos 4 cantos (com transformação de perspectiva própria em canvas) |
| Página escura ou borrada | Sem bloqueio; você decide na revisão se refaz |
| PDF enviado acima de 20 MB | Recusa com mensagem |
| Storage ≥ 80% de 1 GB | Aviso no início |
| Apagar turma ou ano com arquivos | Confirmação mostrando a contagem de arquivos |

## 9. Testes

- **Unitários (Vitest):** montagem do PDF (página A4, orientação, ordem das páginas), redimensionamento e compressão, fila do IndexedDB (gravar, tentar de novo, só limpar após confirmação, limpeza de órfão), parser de "colar vários nomes", cálculo de entregues e faltantes, regra de mover arquivo entre turmas.
- **RLS (SQL contra o Supabase local):** usuário anônimo e usuário diferente não leem nem gravam em nenhuma tabela nem no bucket.
- **E2E (Playwright + Supabase local):** login → criar ano, turma e alunos (inclusive colando vários nomes) → enviar arquivo → abrir → mover → apagar; modo lote com câmera falsa do Chromium (`--use-file-for-fake-video-capture`).
- **Manual em aparelho real:** iPhone (Safari) e Android (Chrome) — câmera, detecção, instalação como PWA e Share Target.

## 10. Entrega

- Repositório Git; deploy na Vercel; variáveis do Supabase gerenciadas com `vercel env`.
- Migrações versionadas em `supabase/migrations` (tabelas, RLS, bucket e políticas do Storage).
- README com o setup: criar o projeto no Supabase, aplicar as migrações, criar o usuário no painel, desligar o cadastro público, configurar as variáveis na Vercel.
