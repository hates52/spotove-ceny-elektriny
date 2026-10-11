import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export async function GET() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/instance`, {
      headers: { 'Cache-Control': 'no-store' },
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Backend unavailable' }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });
  } catch {
    return NextResponse.json({ error: 'Failed to reach backend' }, { status: 502 });
  }
}