'use client';

import { createContext, useContext } from 'react';
import { AuthProvider as OidcAuthProvider } from 'react-oidc-context';

export interface AuthConfiguration {
  authority: string;
  clientId: string;
  scope: string;
}

const AuthConfigurationContext = createContext<AuthConfiguration>({
  authority: '',
  clientId: '',
  scope: 'openid profile email',
});

export function useAuthConfiguration() {
  return useContext(AuthConfigurationContext);
}

export default function AuthProvider({
  children,
  configuration,
}: {
  children: React.ReactNode;
  configuration: AuthConfiguration;
}) {
  const oidcConfig = {
    authority: configuration.authority,
    client_id: configuration.clientId,
    redirect_uri: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : '',
    post_logout_redirect_uri: typeof window !== 'undefined' ? `${window.location.origin}/auth/logout` : '',
    response_type: 'code',
    scope: configuration.scope.trim() || 'openid profile email',
    automaticSilentRenew: true,
    loadUserInfo: false,
  };

  if (!configuration.authority || !configuration.clientId) {
    return (
      <AuthConfigurationContext.Provider value={configuration}>
        {children}
      </AuthConfigurationContext.Provider>
    );
  }

  return (
    <AuthConfigurationContext.Provider value={configuration}>
      <OidcAuthProvider {...oidcConfig}>{children}</OidcAuthProvider>
    </AuthConfigurationContext.Provider>
  );
}
