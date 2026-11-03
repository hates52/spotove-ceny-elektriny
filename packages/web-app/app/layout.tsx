import type { Viewport } from 'next';
import './globals.css';
import AutoRefresh from '../components/AutoRefresh';
import HourlyPriceScheduler from '../components/HourlyPriceScheduler';
import AuthProvider from '@/components/AuthProvider';
import RequireAuth from '@/components/RequireAuth';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authority = process.env.OIDC_AUTHORITY || '';
  const authConfiguration = {
    authority,
    clientId: process.env.OIDC_CLIENT_ID || process.env.AZURE_CLIENT_ID || '',
    scope: process.env.OIDC_SCOPE ||
      (process.env.AZURE_API_SCOPE
        ? `openid profile email ${process.env.AZURE_API_SCOPE}`
        : 'openid profile email'),
  };

  return (
    <html lang="cs">
      <body className="antialiased">
        <AuthProvider configuration={authConfiguration}>
          {children}
          <AutoRefresh />
          <HourlyPriceScheduler />
        </AuthProvider>
      </body>
    </html>
  );
}
