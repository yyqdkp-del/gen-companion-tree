import type { Metadata, Viewport } from 'next'
import './globals.css'
import { AppProvider } from './context/AppContext'
import ClientComponents from '@/app/components/ClientComponents'
import PostHogInit from '@/app/components/PostHogInit'
import Toast from '@/app/components/Toast'

export const metadata: Metadata = {
  title: '根 · Companion',
  description: 'Automated Life System',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: '根 · Companion',
  },
}

export const viewport: Viewport = {
  themeColor: '#1D9E75',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600&family=Noto+Serif+SC:wght@300;400;500;700&display=swap"
          rel="stylesheet"
        />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="根 · Companion" />
        <HotjarScript />
      </head>
      <body>
        <AppProvider>
          {children}
          <PostHogInit />
          <ClientComponents />
          <Toast />
        </AppProvider>
        <RegisterSW />
      </body>
    </html>
  )
}

function HotjarScript() {
  const raw = process.env.NEXT_PUBLIC_HOTJAR_ID?.trim()
  const hjid = raw ? Number.parseInt(raw, 10) : NaN
  if (!Number.isFinite(hjid) || hjid <= 0) return null

  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          (function(h,o,t,j,a,r){
            h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
            h._hjSettings={hjid:${hjid},hjsv:6};
            a=o.getElementsByTagName('head')[0];
            r=o.createElement('script');r.async=1;
            r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
            a.appendChild(r);
          })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');
        `,
      }}
    />
  )
}

function RegisterSW() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js');
            });
          }
        `,
      }}
    />
  )
}
