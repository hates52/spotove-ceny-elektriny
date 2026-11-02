'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from 'react-oidc-context';

export default function CallbackPage() {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!auth.isLoading && auth.isAuthenticated) {
      router.replace('/');
    } else if (!auth.isLoading && auth.error) {
      router.replace('/?error=auth');
    }
  }, [auth.isLoading, auth.isAuthenticated, auth.error, router]);

  return <div className="p-4">Signing in...</div>;
}
