'use client';

import { useAuth } from 'react-oidc-context';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuthConfiguration } from '@/components/AuthProvider';
import { useTheme } from 'next-themes';

export default function LoginPage() {
  const auth = useAuth();
  const router = useRouter();
  const configuration = useAuthConfiguration();
  const { setTheme } = useTheme();

  useEffect(() => {
    setTheme('light');
  }, [setTheme]);

  const authEnabled = !!(configuration.authority && configuration.clientId);

  useEffect(() => {
    if (!authEnabled) return;
    if (auth.isAuthenticated) {
      router.replace('/');
    }
  }, [auth.isAuthenticated, router, authEnabled]);

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 z-0" aria-hidden="true">
        <Image
          src="/assets/background.jpeg"
          alt=""
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/60 via-transparent to-emerald-900/30" />
      </div>

      <div className="relative z-10 bg-white/95 backdrop-blur-sm p-8 rounded-2xl shadow-2xl max-w-md w-full mx-4 border border-slate-200">
        <div className="flex flex-col items-center mb-6">
          <Image src="/assets/logo.svg" alt="Spotové ceny elektřiny logo" width={80} height={80} className="mb-4" />
          <h1 className="text-xl font-semibold text-slate-900">Spotové ceny elektřiny</h1>
        </div>
        {!authEnabled && <p className="text-sm text-slate-600 text-center">OIDC není nakonfigurován</p>}
        {authEnabled && auth.isLoading && <p className="text-sm text-slate-600 text-center">Načítání...</p>}
        {authEnabled && auth.error && <p className="text-sm text-red-600 mb-4 text-center">{auth.error.message}</p>}
        {authEnabled && !auth.isLoading && !auth.isAuthenticated && (
          <button
            onClick={() => auth.signinRedirect()}
            className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold transition-colors"
          >
            Přihlásit
          </button>
        )}
      </div>
    </div>
  );
}