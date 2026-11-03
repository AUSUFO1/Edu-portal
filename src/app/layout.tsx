import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { UNIVERSITY_NAME } from '@/domain/portals';
import './globals.css';

const poppins = localFont({
  src: [
    { path: './fonts/poppins-400.woff2', weight: '400' },
    { path: './fonts/poppins-500.woff2', weight: '500' },
    { path: './fonts/poppins-600.woff2', weight: '600' },
    { path: './fonts/poppins-700.woff2', weight: '700' },
  ],
  variable: '--font-poppins',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: UNIVERSITY_NAME, template: `%s · ${UNIVERSITY_NAME}` },
  description: 'University Education Management Portal: course registration, results and academic administration.',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#0c3b2f' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-NG" className={poppins.variable}>
      <body>{children}</body>
    </html>
  );
}
