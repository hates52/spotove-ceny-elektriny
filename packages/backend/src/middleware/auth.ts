import { Request, Response, NextFunction } from 'express';
import { createRemoteJWKSet, jwtVerify, JWTPayload } from 'jose';




let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

export interface AuthRequest extends Request {
  user?: JWTPayload & { groups?: string[] };
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const ISSUER = process.env.OIDC_ISSUER;
    const AUDIENCE = process.env.OIDC_AUDIENCE || process.env.AZURE_AD_AUDIENCE;
    const REQUIRED_GROUP = process.env.OIDC_REQUIRED_GROUP || process.env.AZURE_AD_REQUIRED_GROUP || '';
    const TENANT_ID = process.env.AZURE_TENANT_ID;
    const JWKS_URL = process.env.OIDC_JWKS_URL ||
      (TENANT_ID ? `https://login.microsoftonline.com/${TENANT_ID}/discovery/v2.0/keys` : undefined) ||
      (ISSUER ? `${ISSUER}/discovery/v2.0/keys` : undefined) ||
      (ISSUER ? `${ISSUER}/.well-known/jwks.json` : undefined);
    if (!jwks && JWKS_URL) {
      jwks = createRemoteJWKSet(new URL(JWKS_URL));
    }
    if (!jwks) {
      console.error('OIDC not configured: JWKS_URL=', JWKS_URL, 'ISSUER=', ISSUER);
      return res.status(500).json({ error: 'OIDC not configured' });
    }

    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      console.error('Missing token in /api/auth/me');
      return res.status(401).json({ error: 'Missing token' });
    }

    const verifyOptions: Record<string, unknown> = {};
    if (TENANT_ID) {
      verifyOptions.issuer = [
        `https://login.microsoftonline.com/${TENANT_ID}/v2.0`,
        `https://sts.windows.net/${TENANT_ID}/`,
      ];
    } else if (ISSUER) {
      verifyOptions.issuer = ISSUER;
    }
    if (AUDIENCE) verifyOptions.audience = AUDIENCE;

    const { payload } = await jwtVerify(token, jwks, verifyOptions);

    const groups = (payload.groups as string[]) || (payload.roles as string[]) || (payload['roles'] as string[]) || [];
    
    // Azure AD can use group object IDs or names; also check 'wids' for directory roles
    if (REQUIRED_GROUP) {
      const hasGroup = groups.includes(REQUIRED_GROUP) || 
                       (payload.wids && Array.isArray(payload.wids) && payload.wids.includes(REQUIRED_GROUP));
      if (!hasGroup) {
        console.error('Missing required group. Required:', REQUIRED_GROUP, 'Groups:', groups, 'wids:', payload.wids);
        return res.status(403).json({ error: 'Forbidden: missing required group' });
      }
    }

    req.user = { ...payload, groups };
    next();
  } catch (err) {
    console.error('Auth error:', err);
    return res.status(401).json({ error: 'Invalid token' });
  }
}
