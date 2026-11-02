import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';

const syne = localFont({ src: './fonts/syne-latin.woff2', weight: '500 800', variable: '--font-syne', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'University Portal', template: '%s · University Portal' },
  description: 'University Education Management Portal: course registration, results and academic administration.',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#0c3b2f' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-NG" className={syne.variable}>
      <body>{children}</body>
    </html>
  );
}
