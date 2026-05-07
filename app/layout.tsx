import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'
import { AuthProvider } from '@/providers/AuthProvider'
import { ChatProvider } from '@/providers/ChatProvider'
import ClientRoot from '@/components/auth/ClientRoot'
import FloatingChatWindow from '@/components/chat/FloatingChatWindow'
import ThemeProvider from '@/components/common/ThemeProvider'

const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT

export const metadata: Metadata = {
  metadataBase: new URL('https://ssokeng.vercel.app'),
  title: {
    default: 'YouTube AI Summary | SSOKENG — Save key insights to your library',
    template: '%s | SSOKENG YouTube AI Summary',
  },
  description: 'AI automatically summarizes and analyzes YouTube videos, saving just the key points to your library. Recipes, language learning, news, and more.',
  keywords: ['youtube summary', 'AI youtube summary', 'video summary', 'AI video analysis', 'youtube library', 'recipe summary', 'english learning youtube'],
  authors: [{ name: 'SSOKENG' }],
  creator: 'SSOKENG',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://ssokeng.vercel.app',
    siteName: 'SSOKENG',
    title: 'YouTube AI Summary | SSOKENG — Save key insights to your library',
    description: 'AI automatically summarizes and analyzes YouTube videos, saving just the key points to your library.',
  },
  twitter: {
    card: 'summary_large_image',
    site: '@ssokeng',
    title: 'YouTube AI Summary | SSOKENG — Save key insights to your library',
    description: 'AI automatically summarizes and analyzes YouTube videos, saving just the key points to your library.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-snippet': -1, 'max-image-preview': 'large' },
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ?? '',
    other: {
      'naver-site-verification': ['aaf6d83f723d68faddb24283da6de1c8400d7b12'],
    },
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko" className="dark">
      <head>
        {/* Pretendard 폰트 */}
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" />
        {/* Google AdSense */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3976821769415958"
          crossOrigin="anonymous"
        />
        {/* FOUC 방지: 렌더 전에 저장된 테마 클래스 즉시 적용 */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){
            var t = localStorage.getItem('theme') || 'dark';
            document.documentElement.classList.toggle('dark', t === 'dark');
            document.documentElement.classList.toggle('light', t === 'light');
          })()
        `}} />
        {/* Naver Analytics */}
        <Script
          id="naver-analytics"
          src="//wcs.pstatic.net/wcslog.js"
          strategy="afterInteractive"
        />
        <Script
          id="naver-analytics-init"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{ __html: `
            if(!wcs_add) var wcs_add = {};
            wcs_add["wa"] = "194425f5b7da7a0";
            if(window.wcs) { wcs_do(); }
          `}}
        />
        {/* Google Tag Manager */}
        <Script
          id="gtm-head"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{ __html: `
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','GTM-5FKKZPSB');
          `}}
        />
      </head>
      <body>
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-5FKKZPSB"
            height="0" width="0"
            style={{ display: 'none', visibility: 'hidden' }}
          />
        </noscript>
        <ThemeProvider>
          <AuthProvider>
            <ChatProvider>
              <ClientRoot>{children}</ClientRoot>
              <FloatingChatWindow />
            </ChatProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
