import type { Metadata, Viewport } from 'next';
import { DM_Sans, Sora } from 'next/font/google';
import './globals.css';
import AppInitializer from '@/components/AppInitializer';
import ThemeProvider from '@/components/ThemeProvider';
import BottomNav from '@/components/BottomNav';
import NotificationScheduler from '@/components/NotificationScheduler';
import OfflineBanner from '@/components/OfflineBanner';
import OnboardingTutorial from '@/components/OnboardingTutorial';

const sora = Sora({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-sora',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-dm-sans',
});

export const metadata: Metadata = {
  title: 'Class Time — MN 3C',
  description: 'MN 3C class schedule and personal routines — UMaT',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icons/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Classes',
  },
};

export const viewport: Viewport = {
  themeColor: '#F5F5F0',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${sora.variable} ${dmSans.variable}`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('isaac-app-theme')||'light';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.setAttribute('data-theme','dark');}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        <AppInitializer>
          <ThemeProvider>
          <OfflineBanner />
          <OnboardingTutorial />
          <NotificationScheduler />
          <div className="mx-auto min-h-screen max-w-[430px] bg-bg-base pb-24">
            {children}
          </div>
          <BottomNav />
          </ThemeProvider>
        </AppInitializer>
      </body>
    </html>
  );
}
