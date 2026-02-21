import type { Hono } from 'hono';
import Stripe from 'stripe';
import type { Bindings } from '../types';
import { requireUser } from '../lib/auth';
import { getStripe, getSupabaseAdmin } from '../lib/clients';

export const registerStripeRoutes = (app: Hono<{ Bindings: Bindings }>) => {
    app.post('/stripe/webhook', async (c) => {
        const signature = c.req.header('stripe-signature');
        const body = await c.req.text();

        if (!signature) {
            return c.json({ error: 'No signature' }, 400);
        }

        try {
            const stripe = getStripe(c.env);
            const event = await stripe.webhooks.constructEventAsync(
                body,
                signature,
                c.env.STRIPE_WEBHOOK_SECRET
            );

            const supabaseAdmin = getSupabaseAdmin(c.env);

            switch (event.type) {
                case 'checkout.session.completed': {
                    const session = event.data.object as Stripe.Checkout.Session;
                    const userId = session.metadata?.user_id;
                    const subscriptionId = (session as any).subscription;

                    if (userId && subscriptionId) {
                        await supabaseAdmin
                            .from('subscriptions')
                            .upsert({
                                visitor_id: userId,
                                stripe_subscription_id: subscriptionId,
                                status: 'active',
                            });
                    }
                    break;
                }
                case 'customer.subscription.updated':
                case 'customer.subscription.deleted': {
                    const subscription = event.data.object as Stripe.Subscription;
                    await supabaseAdmin
                        .from('subscriptions')
                        .update({ status: subscription.status })
                        .eq('stripe_subscription_id', subscription.id);
                    break;
                }
                default:
                    break;
            }

            return c.json({ received: true });
        } catch (error) {
            console.error('Webhook error:', error);
            return c.json({ error: 'Webhook error' }, 400);
        }
    });

    app.post('/stripe/checkout', async (c) => {
        const { errorResponse, user } = await requireUser(c);
        if (errorResponse || !user) return errorResponse;

        const stripe = getStripe(c.env);
        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'krw',
                        product_data: {
                            name: '사장님 인스타 Pro',
                            description: '무제한 글 생성',
                        },
                        unit_amount: 9900,
                        recurring: {
                            interval: 'month',
                        },
                    },
                    quantity: 1,
                },
            ],
            metadata: {
                user_id: user.id,
            },
            success_url: `${c.req.header('Origin')}/success`,
            cancel_url: `${c.req.header('Origin')}/pricing`,
        });

        return c.json({ url: session.url });
    });
};
