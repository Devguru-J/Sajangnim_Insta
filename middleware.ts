import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

export function middleware(request: NextRequest) {
    const response = NextResponse.next();
    const visitorId = request.cookies.get('visitor_id')?.value;

    if (!visitorId) {
        const newVisitorId = uuidv4();
        response.cookies.set('visitor_id', newVisitorId, {
            httpOnly: true,
            path: '/',
            maxAge: 60 * 60 * 24 * 365, // 1 year
            sameSite: 'lax'
        });
    }

    return response;
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes) -> actually we WANT to match API to ensure consistency, 
         *   but usually middleware runs before API.
         *   Wait, if we generate it in middleware, API will receive it in request? 
         *   Middleware runs before request reaches API.
         *   BUT Next.js middleware modifying request cookies/headers is passed to Server Components/API?
         *   Yes.
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
};
