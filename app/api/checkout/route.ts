import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2024-12-18.acacia' as any, // Use latest or what's installed
});

export async function POST(request: Request) {
    try {
        const cookieStore = await cookies();
        let visitorId = cookieStore.get('visitor_id')?.value;

        // If no visitor_id, create one (unlikely if they came from limit reached, but safely)
        if (!visitorId) {
            visitorId = uuidv4();
            // Note: we can't easily set cookie from here if we just redirect, 
            // but client side should have handled it or we rely on session persistence.
            // For MVP, assume it exists or we use metadata to link.
        }

        const session = await stripe.checkout.sessions.create({
            line_items: [
                {
                    price: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID,
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: `${request.headers.get('origin')}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${request.headers.get('origin')}/limit-reached`, // Go back to paywall
            metadata: {
                visitor_id: visitorId,
            },
        });

        return NextResponse.json({ url: session.url });
    } catch (err: any) {
        console.error(err);
        return NextResponse.json(
            { error: err.message },
            { status: 500 }
        );
    }
}
