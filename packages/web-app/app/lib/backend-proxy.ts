import https from 'node:https';
import type { IncomingHttpHeaders, OutgoingHttpHeaders } from 'node:http';
import { NextResponse } from 'next/server';

const backendUrl = new URL(process.env.BACKEND_URL ?? 'https://localhost:4000');
const insecureTls = process.env.INSECURE_TLS?.toLowerCase() === 'true';
const hopByHopHeaders = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]);

if (backendUrl.protocol !== 'https:') {
  throw new Error('BACKEND_URL must use HTTPS');
}

function toNodeHeaders(headers: Headers): OutgoingHttpHeaders {
  const result: OutgoingHttpHeaders = {};
  headers.forEach((value, name) => {
    if (!hopByHopHeaders.has(name.toLowerCase()) && name.toLowerCase() !== 'host') {
      result[name] = value;
    }
  });
  return result;
}

function toWebHeaders(headers: IncomingHttpHeaders): Headers {
  const result = new Headers();
  for (const [name, value] of Object.entries(headers)) {
    if (value && !hopByHopHeaders.has(name.toLowerCase())) {
      if (Array.isArray(value) && name.toLowerCase() === 'set-cookie') {
        value.forEach((cookie) => result.append(name, cookie));
      } else {
        result.set(name, Array.isArray(value) ? value.join(', ') : value);
      }
    }
  }
  return result;
}

export async function proxyBackendRequest(request: Request, backendPath: string): Promise<Response> {
  const requestUrl = new URL(request.url);
  const targetPath = `${backendPath}${requestUrl.search}`;
  const body = request.method === 'GET' || request.method === 'HEAD'
    ? undefined
    : Buffer.from(await request.arrayBuffer());

  const requestHeaders = toNodeHeaders(request.headers);
  if (body) requestHeaders['content-length'] = String(body.byteLength);

  return new Promise((resolve) => {
    const upstream = https.request(
      new URL(targetPath, backendUrl),
      {
        method: request.method,
        headers: requestHeaders,
        rejectUnauthorized: !insecureTls,
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on('error', (error) => {
          console.error(`[proxy] Backend response failed: ${error.message}`);
          resolve(NextResponse.json({ error: 'Backend unavailable' }, { status: 502 }));
        });
        response.on('data', (chunk: Buffer | string) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });
        response.on('end', () => {
          const responseBody = response.statusCode === 204 || response.statusCode === 304
            ? null
            : Buffer.concat(chunks);
          resolve(new Response(responseBody, {
            status: response.statusCode ?? 502,
            headers: toWebHeaders(response.headers),
          }));
        });
      },
    );

    upstream.on('error', (error) => {
      console.error(`[proxy] Backend request failed: ${error.message}`);
      resolve(NextResponse.json({ error: 'Backend unavailable' }, { status: 502 }));
    });

    if (body) upstream.write(body);
    upstream.end();
  });
}
