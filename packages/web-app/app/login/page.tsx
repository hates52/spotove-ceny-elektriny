'use client';

import { useAuth } from 'react-oidc-context';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuthConfiguration } from '@/components/AuthProvider';

export default function LoginPage() {
  const auth = useAuth();
  const router = useRouter();
  const configuration = useAuthConfiguration();

  const authEnabled = !!(configuration.authority && configuration.clientId);

  useEffect(() => {
    if (!authEnabled) return;
    if (auth.isAuthenticated) {
      router.replace('/');
    }
  }, [auth.isAuthenticated, router, authEnabled]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded shadow max-w-md w-full">
        <div className="flex flex-col items-center mb-6">
          <Image src="/assets/logo.svg" alt="Spotové ceny elektřiny logo" width={80} height={80} className="mb-4" />
          <h1 className="text-xl font-semibold">Spotové ceny elektřiny</h1>
        </div>
        {!authEnabled && <p className="text-sm text-gray-600">OIDC není nakonfigurován</p>}
        {authEnabled && auth.isLoading && <p className="text-sm text-gray-600 text-center">Načítání...</p>}
        {authEnabled && auth.error && <p className="text-sm text-red-600 mb-4">{auth.error.message}</p>}
        {authEnabled && !auth.isLoading && !auth.isAuthenticated && (
          <button
            onClick={() => auth.signinRedirect()}
            className="w-full px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 font-semibold"
          >
            Přihlásit
          </button>
        )}
      </div>
    </div>
  );
}
