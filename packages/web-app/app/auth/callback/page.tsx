'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from 'react-oidc-context';

export default function CallbackPage() {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (auth.isLoading) return;
    if (auth.error) {
      router.replace('/?error=auth');
      return;
    }
    if (!auth.isAuthenticated || !auth.user) return;

    const token = auth.user.access_token;
    (async () => {
      try {
        const res = await fetch('/api/backend/auth/me', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) {
          await auth.signoutRedirect();
          return;
        }
        router.replace('/');
      } catch {
        await auth.signoutRedirect();
      }
    })();
  }, [auth.isLoading, auth.isAuthenticated, auth.error, auth.user, router, auth]);

  return <div className="p-4">Signing in...</div>;
}
