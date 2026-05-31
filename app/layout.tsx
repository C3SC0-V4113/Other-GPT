import { Geist, Geist_Mono, Montserrat } from 'next/font/google';
import Script from 'next/script';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale } from 'next-intl/server';

import { ThemeProvider } from '@/components/theme/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';

import type { Metadata } from 'next';

import './globals.css';

const montserrat = Montserrat({ subsets: ['latin'], variable: '--font-sans' });

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'otro-GPT',
  description: 'Single-session server-first chat powered by OpenAI.',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={cn(
        'h-full',
        'antialiased',
        geistSans.variable,
        geistMono.variable,
        'font-sans',
        montserrat.variable
      )}
    >
      <body className="flex min-h-full flex-col">
        {process.env.NODE_ENV === 'development' ? (
          <Script
            src="https://unpkg.com/react-scan/dist/auto.global.js"
            strategy="afterInteractive"
            crossOrigin="anonymous"
          />
        ) : null}
        <NextIntlClientProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            storageKey="otro-gpt-theme-mode"
          >
            {children}
            <Toaster />
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
