import { NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const BACKEND = `${API_BASE_URL}/api/auth/jwt/create/`;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username, password } = body;

    const res = await fetch(BACKEND, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return NextResponse.json({ error: data || 'Authentication failed' }, { status: res.status });
    }

    const token = data?.access || data?.token || data?.access_token || (data?.refresh?.access) || null;

    const response = NextResponse.json({ user: { username }, data });

    if (token) {
      // Set an httpOnly cookie so middleware can read it server-side
      // maxAge: 1 day
      response.cookies.set('accessToken', token, { httpOnly: true, path: '/', maxAge: 60 * 60 * 24, sameSite: 'lax' });
    }

    return response;
  } catch (err) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
