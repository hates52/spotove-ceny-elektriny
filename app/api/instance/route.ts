import { NextResponse } from 'next/server';

const instanceId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export async function GET() {
  const response = NextResponse.json({ instanceId });
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  return response;
}
