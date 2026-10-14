# Organizador de Trabalhos

Pastas de trabalhos escaneados por aluno (ano letivo → turma → aluno), com scanner pelo celular.

## Rodar localmente

Pré-requisitos: Node 22+, Docker.

```bash
npm install
npm run db:start                       # sobe o Supabase local e gera .env.local
npm run usuario -- voce@email.com SuaSenha
npm run dev                            # http://localhost:3000
```

- Se `npx` falhar no seu ambiente, use `npm exec -- supabase ...` no lugar de `npx supabase ...` (os scripts do projeto já funcionam assim).
- O Supabase local deste projeto usa portas deslocadas em +100 para evitar conflito com outro projeto local: a API fica em `http://127.0.0.1:54421` e o banco na porta `54422`.

## Testes

```bash
npm test          # unitários
npm run test:int  # integração (Supabase local)
npm run test:db   # RLS (pgTAP)
npm run test:e2e  # Playwright (câmera falsa)
```

## Produção (Supabase + Vercel)

1. Crie um projeto em supabase.com.
2. Aplique o banco:
   ```bash
   npx supabase login
   npx supabase link --project-ref <ref-do-projeto>
   npx supabase db push
   ```
   (Se `npx` falhar, use `npm exec -- supabase ...` em cada comando.)
3. No painel do Supabase:
   - **Authentication → Sign In / Providers:** mantenha o provedor **Email** ligado (desligá-lo bloqueia o login) e desligue **"Allow new users to sign up"**.
   - **Authentication → Users → Add user:** crie sua conta com "Auto Confirm User".
4. Na Vercel:
   ```bash
   vercel link
   vercel env add NEXT_PUBLIC_SUPABASE_URL production
   vercel env add NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY production
   vercel deploy --prod
   ```
   `SUPABASE_SECRET_KEY` **não** vai para a Vercel; o app não usa.
5. No celular, abra o site e use "Adicionar à tela inicial". No Android, o app passa a aparecer no menu "Compartilhar".

## Limites

- Plano grátis do Supabase: ~1 GB de arquivos. O início mostra o uso e avisa a partir de 80%.
- PDF enviado pronto: até 20 MB.
