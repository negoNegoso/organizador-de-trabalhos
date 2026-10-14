import { FormLogin } from './FormLogin';

export default function PaginaLogin() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 p-4">
      <h1 className="text-2xl font-semibold">Organizador de Trabalhos</h1>
      <FormLogin />
    </main>
  );
}
