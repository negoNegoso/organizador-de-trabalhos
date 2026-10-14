import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Organizador de Trabalhos',
    short_name: 'Trabalhos',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#1d4ed8',
    lang: 'pt-BR',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    share_target: {
      action: '/compartilhar',
      method: 'POST',
      enctype: 'multipart/form-data',
      params: { files: [{ name: 'arquivos', accept: ['application/pdf', 'image/*'] }] },
    },
  } as MetadataRoute.Manifest;
}
