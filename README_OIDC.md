# OIDC autentizace

## Backend (.env)
```
OIDC_ISSUER=https://your-issuer
OIDC_AUDIENCE=your-audience
OIDC_JWKS_URL=https://your-issuer/.well-known/jwks.json
OIDC_REQUIRED_GROUP=your-required-group
```

Backend middleware `requireAuth` ověřuje JWT přes JWKS, kontroluje issuer/audience a členství ve skupině (podporuje `groups`, `cognito:groups`, `roles`).

Endpoint: `GET /api/auth/me` (vyžaduje Bearer token + příslušnou skupinu)

## Web app (.env.local)
```
NEXT_PUBLIC_OIDC_AUTHORITY=https://your-issuer
NEXT_PUBLIC_OIDC_CLIENT_ID=your-client-id
NEXT_PUBLIC_OIDC_SCOPE=openid profile email
```

SPA používá `react-oidc-context` s PKCE flow. Callback: `/auth/callback`, logout: `/auth/logout`.

## Azure Entra ID nastavení

### Backend
```
AZURE_TENANT_ID=your-tenant-id
OIDC_ISSUER=https://login.microsoftonline.com/your-tenant-id/v2.0
OIDC_AUDIENCE=api://your-api-client-id  # nebo client ID API
OIDC_JWKS_URL=https://login.microsoftonline.com/your-tenant-id/discovery/v2.0/keys
AZURE_AD_REQUIRED_GROUP=your-group-object-id  # nebo group name pokud je v claims
```
Poznámka: Pro získání group claims v tokenu je třeba nastavit "groupMembershipClaims": ["SecurityGroup"] v app registration manifestu.

### Web app (SPA)
```
NEXT_PUBLIC_OIDC_AUTHORITY=https://login.microsoftonline.com/your-tenant-id/v2.0
NEXT_PUBLIC_OIDC_CLIENT_ID=your-spa-client-id
NEXT_PUBLIC_AZURE_API_SCOPE=api://your-api-client-id/.default  # nebo custom scope
NEXT_PUBLIC_OIDC_SCOPE=openid profile email api://your-api-client-id/.default
```
V Azure AD nastav redirect URI na `http://localhost:3000/auth/callback` a povol implicit flow/PKCE (SPA). Pro volání backendu použij access token z `auth.user?.access_token`.
