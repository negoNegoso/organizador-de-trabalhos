import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function atualizarSessao(request: NextRequest) {
  let resposta = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (lista) => {
          lista.forEach(({ name, value }) => request.cookies.set(name, value));
          resposta = NextResponse.next({ request });
          lista.forEach(({ name, value, options }) => resposta.cookies.set(name, value, options));
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const ehLogin = request.nextUrl.pathname.startsWith('/login');

  if (!user && !ehLogin) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    return NextResponse.redirect(url);
  }
  if (user && ehLogin) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.search = '';
    return NextResponse.redirect(url);
  }
  return resposta;
}
