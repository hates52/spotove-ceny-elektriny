'use client';

import { User } from 'oidc-client-ts';

export function getAccessToken(user: User | null | undefined): string | null {
  if (!user) return null;
  return user.access_token || null;
}

export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}, token?: string | null): Promise<Response> {
  const headers = new Headers(init.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return fetch(input, { ...init, headers });
}
