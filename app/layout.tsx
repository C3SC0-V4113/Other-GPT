import { Geist, Geist_Mono, Montserrat } from 'next/font/google';

import { ThemeProvider } from '@/components/theme/theme-provider';
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
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
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          storageKey="otro-gpt-theme-mode"
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
