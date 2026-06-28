// Auth protection désactivée temporairement — on la rebranche lors du back
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default function middleware(_req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
