#!/usr/bin/env bash
set -euo pipefail
eval "$(npm exec -- supabase status -o env 2>/dev/null)"
cat > .env.local <<ENV
NEXT_PUBLIC_SUPABASE_URL=$API_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$ANON_KEY
SUPABASE_SECRET_KEY=$SERVICE_ROLE_KEY
TEST_EMAIL=professora@teste.local
TEST_PASSWORD=senha-de-teste-123
ENV
echo ".env.local gerado"
