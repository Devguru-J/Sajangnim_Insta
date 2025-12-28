import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2024-12-18.acacia' as any,
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature') as string;

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
        console.error(`Webhook signature verification failed: ${err.message}`);
        return NextResponse.json({ error: err.message }, { status: 400 });
    }

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session;
                const visitorId = session.metadata?.visitor_id;
                const subscriptionId = session.subscription as string;
                const customerId = session.customer as string;

                if (visitorId) {
                    // Upsert subscription
                    await supabaseAdmin.from('subscriptions').upsert({
                        visitor_id: visitorId,
                        stripe_customer_id: customerId,
                        stripe_subscription_id: subscriptionId,
                        status: 'active',
                        created_at: new Date().toISOString()
                    }, { onConflict: 'visitor_id' }); // Assuming 1 sub per visitor for MVP
                }
                break;
            }
            case 'invoice.payment_succeeded': {
                // Handle recurring payment success if needed
                // For MVP, checkout session completed sets it active.
                // You might want to update current_period_end here.
                const invoice = event.data.object as Stripe.Invoice;
                const subscriptionId = invoice.subscription as string;
                // Find visitor by subscriptionId and update
                break;
            }
            case 'customer.subscription.deleted': {
                const subscription = event.data.object as Stripe.Subscription;
                const subscriptionId = subscription.id;

                await supabaseAdmin.from('subscriptions')
                    .update({ status: 'inactive' })
                    .eq('stripe_subscription_id', subscriptionId);
                break;
            }
        }
    } catch (err: any) {
        console.error(`Error handling event: ${err.message}`);
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
    }

    return NextResponse.json({ received: true });
}
