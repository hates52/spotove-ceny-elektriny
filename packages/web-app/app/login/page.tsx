'use client';

import { useAuth } from 'react-oidc-context';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (auth.isAuthenticated) {
      router.replace('/');
    }
  }, [auth.isAuthenticated, router]);

  if (!process.env.NEXT_PUBLIC_OIDC_AUTHORITY || !process.env.NEXT_PUBLIC_OIDC_CLIENT_ID) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded shadow max-w-md w-full">
          <h1 className="text-xl font-semibold mb-4">Přihlášení</h1>
          <p className="text-sm text-gray-600">OIDC není nakonfigurován v .env</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded shadow max-w-md w-full">
        <h1 className="text-xl font-semibold mb-6">Přihlášení</h1>
        {auth.isLoading && <p className="text-sm text-gray-600">Načítání...</p>}
        {auth.error && <p className="text-sm text-red-600 mb-4">{auth.error.message}</p>}
        {!auth.isLoading && !auth.isAuthenticated && (
          <button
            onClick={() => auth.signinRedirect()}
            className="w-full px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            Přihlásit pomocí OIDC providera
          </button>
        )}
      </div>
    </div>
  );
}
