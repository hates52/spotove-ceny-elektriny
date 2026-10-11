import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const res = await fetch('https://spotovaelektrina.cz/api/v1/price/get-actual-price-json', {
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch price' }, { status: 500 });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch price' }, { status: 500 });
  }
}
