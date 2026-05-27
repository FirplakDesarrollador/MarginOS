import type { Metadata } from 'next';
import { Inter, Geist_Mono, Geist } from 'next/font/google';
import './globals.css';
import { NavigationBlockerProvider } from '@/contexts/NavigationBlockerContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { TableDensityProvider } from '@/contexts/TableDensityContext';

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-sans',
  display: 'swap',
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
});

const geist = Geist({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'FIRPLAK MarginOS',
  description: 'Strategic Pricing & Margin Intelligence',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${geistMono.variable} font-sans antialiased text-text-primary bg-surface-bg transition-colors duration-200`}>
        <ThemeProvider>
          <TableDensityProvider>
            <NavigationBlockerProvider>
              {children}
            </NavigationBlockerProvider>
          </TableDensityProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
