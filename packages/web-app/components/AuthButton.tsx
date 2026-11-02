'use client';

import { useAuth } from 'react-oidc-context';

export default function AuthButton() {
  const auth = useAuth();

  if (!process.env.NEXT_PUBLIC_OIDC_AUTHORITY || !process.env.NEXT_PUBLIC_OIDC_CLIENT_ID) {
    return null;
  }

  if (auth.isLoading) {
    return <button className="px-3 py-1 text-sm rounded bg-gray-200">Načítání...</button>;
  }

  if (auth.isAuthenticated) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-700">{auth.user?.profile?.name || auth.user?.profile?.email}</span>
        <button onClick={() => auth.signoutRedirect()} className="px-3 py-1 text-sm rounded bg-gray-200 hover:bg-gray-300">Odhlásit</button>
      </div>
    );
  }

  return <button onClick={() => auth.signinRedirect()} className="px-3 py-1 text-sm rounded bg-indigo-600 text-white hover:bg-indigo-700">Přihlásit</button>;
}
