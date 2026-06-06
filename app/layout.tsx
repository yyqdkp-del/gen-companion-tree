import type { Metadata, Viewport } from 'next'
import './globals.css'
import { AppProvider } from './context/AppContext'
import ClientComponents from '@/app/components/ClientComponents'
import PostHogInit from '@/app/components/PostHogInit'
import Toast from '@/app/components/Toast'

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || 'https://gen-companion-tree.vercel.app',
  ),
  title: {
    default: '根陪伴 — 海外华人家庭的智能生活管家',
    template: '%s | 根陪伴',
  },
  description:
    '专为海外华人家庭打造的根。汉字解码、木棉树洞情感陪伴、成长周报、学校通知解析。让孩子的中文根扎在异乡。',
  keywords: ['海外华人', '华人家庭', '汉字学习', '家庭助手', '根', '国际学校'],
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    siteName: '根陪伴',
    title: '根陪伴 — 海外华人家庭的智能生活管家',
    description:
      '专为海外华人家庭打造的根。汉字解码、木棉树洞、成长周报、学校通知解析。',
    images: [{ url: '/icons/icon-512.png', width: 512, height: 512, alt: '根陪伴' }],
  },
  twitter: {
    card: 'summary',
    title: '根陪伴',
    description: '海外华人家庭的智能生活管家',
    images: ['/icons/icon-512.png'],
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: '根陪伴',
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
    <html lang="zh-CN">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600&family=Noto+Serif+SC:wght@300;400;500;700&display=swap"
          rel="stylesheet"
        />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        {/* apple-mobile-web-app-* 由上面 metadata.appleWebApp 自动注入，
            不再在这里重复声明，避免 statusBarStyle 冲突。 */}
        <HotjarScript />
      </head>
      <body className="transition-ink-wash">
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
