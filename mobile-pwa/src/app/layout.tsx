import type { Metadata, Viewport } from 'next'
import './globals.css'

const BASE_PATH = process.env.NODE_ENV === 'production' ? '/CoranBuilding' : ''

export const metadata: Metadata = {
  title: 'مبنى القرآن — The Coran Building',
  description: 'Application de mémorisation du Coran gamifiée — صدقة جارية',
  manifest: `${BASE_PATH}/manifest.json`,
  appleWebApp: {
    capable: true,
    title: 'مبنى القرآن',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    apple: `${BASE_PATH}/icons/icon.svg`,
    icon:  `${BASE_PATH}/icons/icon.svg`,
  },
}

export const viewport: Viewport = {
  themeColor: '#0f172a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="manifest" href={`${BASE_PATH}/manifest.json`} />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="مبنى القرآن" />
        <link rel="apple-touch-icon" href={`${BASE_PATH}/icons/icon.svg`} />
      </head>
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('${BASE_PATH}/sw.js', { scope: '${BASE_PATH}/' })
                    .catch(err => console.warn('SW registration failed:', err))
                })
              }
            `,
          }}
        />
      </body>
    </html>
  )
}
