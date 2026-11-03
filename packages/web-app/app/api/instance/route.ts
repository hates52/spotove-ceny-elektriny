import { proxyBackendRequest } from '@/app/lib/backend-proxy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const response = await proxyBackendRequest(request, '/api/instance');
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  return response;
}