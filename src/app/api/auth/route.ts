// src/app/api/auth/route.ts
// API Routes Autentikasi

import { NextResponse } from 'next/server';

export function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  if (action === 'rate-limit') {
    return NextResponse.json({ terlaluCepat: false, sisaMenit: 15 });
  }
  return NextResponse.json({});
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}