'use client';

import { useAuth } from 'react-oidc-context';

export default function AuthButton() {
  const auth = useAuth();

  if (!process.env.NEXT_PUBLIC_OIDC_AUTHORITY || !process.env.NEXT_PUBLIC_OIDC_CLIENT_ID) {
    return null;
  }

  if (auth.isLoading) {
    return <button className="px-4 py-2 text-base rounded bg-gray-200">Načítání...</button>;
  }

  if (auth.isAuthenticated) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-base font-semibold text-gray-700">{auth.user?.profile?.name || auth.user?.profile?.email}</span>
        <button
          onClick={() => auth.signoutRedirect()}
          className="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 text-base"
        >
          Odhlásit
        </button>
      </div>
    );
  }

  return (
    <button onClick={() => auth.signinRedirect()} className="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 text-base font-semibold">
      Přihlásit
    </button>
  );
}
