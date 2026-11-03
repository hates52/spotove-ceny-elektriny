'use client';

import { useAuth } from 'react-oidc-context';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuthConfiguration } from './AuthProvider';

const PUBLIC_PATHS = ['/login', '/auth/callback', '/auth/logout'];

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const configuration = useAuthConfiguration();

  const authEnabled = !!(configuration.authority && configuration.clientId);
  const isPublic = pathname ? PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/')) : false;

  useEffect(() => {
    if (!authEnabled || isPublic) return;
    if (!auth.isLoading && !auth.isAuthenticated) {
      router.replace('/login');
    }
  }, [auth.isLoading, auth.isAuthenticated, router, authEnabled, isPublic]);

  if (!authEnabled || isPublic) {
    return <>{children}</>;
  }

  if (auth.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">Načítání...</div>
      </div>
    );
  }

  if (!auth.isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
