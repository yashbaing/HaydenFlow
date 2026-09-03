import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { Navigation } from '@/components/layout/Navigation';
import { DisclaimerBanner } from '@/components/layout/DisclaimerBanner';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'HaydenFlow — Programmable Liquidity for Tokenized Markets',
  description:
    'Trade tokenized assets against what they actually move with. HaydenFlow introduces correlated-pair liquidity for capital-efficient AMMs.',
  keywords: 'DeFi, liquidity, correlated assets, AMM, tokenized equities, smart routing, HaydenFlow',
  openGraph: {
    title: 'HaydenFlow',
    description: 'Programmable Liquidity for Tokenized Markets',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="bg-nexora-bg text-nexora-text antialiased">
        <Providers>
          <DisclaimerBanner />
          <Navigation />
          <main className="min-h-screen pt-16">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
