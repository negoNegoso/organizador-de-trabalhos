import Link from 'next/link';
import { BotaoSair } from '@/components/BotaoSair';

export default function LayoutApp({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <header className="flex items-center justify-between border-b bg-white px-4 py-3">
        <Link href="/" className="font-semibold">Organizador</Link>
        <BotaoSair />
      </header>
      <main className="mx-auto max-w-2xl p-4">{children}</main>
    </div>
  );
}
