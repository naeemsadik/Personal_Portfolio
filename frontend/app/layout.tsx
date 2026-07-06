import type { Metadata, Viewport } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { Providers } from '@/components/providers';
import { StickyNav } from '@/components/nav/StickyNav';
import { Footer } from '@/components/sections/Footer';
import { getSettings } from '@/lib/content/read';
import { siteMetadata } from '@/lib/seo';
import { AnalyticsBoot } from '@/components/AnalyticsBoot';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const display = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
});

export const viewport: Viewport = {
  themeColor: '#020617',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
};

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return siteMetadata(settings);
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${display.variable}`}>
      <body className="min-h-dvh bg-background font-sans text-foreground">
        <Providers>
          <StickyNav />
          {children}
          <Footer />
        </Providers>
        <Toaster />
        <AnalyticsBoot />
      </body>
    </html>
  );
}
