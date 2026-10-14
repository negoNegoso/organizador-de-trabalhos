import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Organizador de Trabalhos',
  description: 'Pastas de trabalhos escaneados por aluno',
};

export const viewport: Viewport = { themeColor: '#1d4ed8' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="bg-gray-50 text-gray-900 antialiased">{children}</body>
    </html>
  );
}
