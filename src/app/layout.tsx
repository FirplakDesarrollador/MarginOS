import type { Metadata } from 'next';
import { Poppins } from 'next/font/google';
import './globals.css';
import { NavigationBlockerProvider } from '@/contexts/NavigationBlockerContext';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-poppins',
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
      <body className={`${poppins.variable} font-sans antialiased text-text-primary bg-surface-bg`}>
        <NavigationBlockerProvider>
          {children}
        </NavigationBlockerProvider>
      </body>
    </html>
  );
}
