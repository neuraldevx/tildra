import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization') || '';
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  const url = `${baseUrl}/api/user/status`;
  const res = await fetch(url, {
    headers: { authorization: auth }
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
} 