import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

import { updateSession } from '@/utils/supabase/middleware';

export async function middleware(request: NextRequest) {
    try {
        // 1. Refresh Supabase session
        const response = await updateSession(request);

        // 2. Existing Visitor ID logic
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
    } catch (error) {
        // If middleware fails, let the request through
        console.error('Middleware error:', error);
        return NextResponse.next();
    }
}

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - Server Actions (POST requests to same URL)
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
