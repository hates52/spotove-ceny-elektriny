import { proxyBackendRequest } from '@/app/lib/backend-proxy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function handle(request: Request, { params }: { params: Promise<{ path: string[] }> }): Promise<Response> {
  const resolvedParams = await params;
  const path = resolvedParams.path.map(encodeURIComponent).join('/');
  return proxyBackendRequest(request, `/api/${path}`);
}

export const GET = handle;
export const HEAD = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
