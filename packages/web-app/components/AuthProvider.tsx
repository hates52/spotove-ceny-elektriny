'use client';

import { AuthProvider as OidcAuthProvider } from 'react-oidc-context';

const getConfig = () => {
  const authority = process.env.NEXT_PUBLIC_OIDC_AUTHORITY || '';
  const clientId = process.env.NEXT_PUBLIC_OIDC_CLIENT_ID || process.env.NEXT_PUBLIC_AZURE_CLIENT_ID || '';
  const scope = process.env.NEXT_PUBLIC_OIDC_SCOPE || 
    (authority.includes('login.microsoftonline.com') ? 'openid profile email api://' + (process.env.NEXT_PUBLIC_AZURE_API_SCOPE || '') : 'openid profile email');

  return {
    authority,
    client_id: clientId,
    redirect_uri: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : '',
    post_logout_redirect_uri: typeof window !== 'undefined' ? `${window.location.origin}/auth/logout` : '',
    response_type: 'code',
    scope: scope.trim() || 'openid profile email',
    automaticSilentRenew: true,
    loadUserInfo: false,
  };
};

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const config = getConfig();
  if (!config.authority || !config.client_id) {
    return <>{children}</>;
  }
  return <OidcAuthProvider {...config}>{children}</OidcAuthProvider>;
}
