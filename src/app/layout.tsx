import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Nova — Compagnon Star Citizen',
  description: 'Copilote vocal IA immersif et ordinateur de bord Star Citizen avec Gemini 3.8 LIVE et pont DirectInput',
  manifest: '/nova/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Nova — Star Citizen',
  },
  icons: {
    icon: [
      { url: '/nova/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/nova/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { url: '/nova/favicon.ico', sizes: 'any' },
    ],
    apple: '/nova/icons/icon-192.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#06b6d4',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className="dark">
      <head>
        <link rel="icon" href="/nova/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/nova/icons/icon-192.png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  var isNova = window.location.pathname.startsWith('/nova');
                  var swUrl = isNova ? '/nova/sw.js' : '/sw.js';
                  var swScope = isNova ? '/nova/' : '/';
                  navigator.serviceWorker.register(swUrl, { scope: swScope })
                    .then(function(reg) {
                      console.log('[Nova PWA] Service Worker actif (scope: ' + reg.scope + ')');
                    })
                    .catch(function(err) {
                      console.warn('[Nova PWA] Service Worker non enregistre :', err);
                    });
                });
              }
            `,
          }}
        />
      </head>
      <body className="antialiased select-none">{children}</body>
    </html>
  );
}
