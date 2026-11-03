import { proxyBackendRequest } from '@/app/lib/backend-proxy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: { path: string[] } };

function handle(request: Request, { params }: RouteContext): Promise<Response> {
  const path = params.path.map(encodeURIComponent).join('/');
  return proxyBackendRequest(request, `/api/${path}`);
}

export const GET = handle;
export const HEAD = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
