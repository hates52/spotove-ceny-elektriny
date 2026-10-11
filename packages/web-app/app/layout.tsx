import type { Viewport } from 'next';
import './globals.css';
import AutoRefresh from '../components/AutoRefresh';
import HourlyPriceScheduler from '../components/HourlyPriceScheduler';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="cs">
      <body className="antialiased">
        {children}
        <AutoRefresh />
        <HourlyPriceScheduler />
      </body>
    </html>
  );
}
