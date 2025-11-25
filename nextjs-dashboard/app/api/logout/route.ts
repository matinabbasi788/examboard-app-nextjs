import { NextResponse } from 'next/server';

export async function POST() {
  const res = NextResponse.json({ ok: true });
  // clear the cookie
  res.cookies.set('accessToken', '', { path: '/', expires: new Date(0) });
  return res;
}
