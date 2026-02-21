import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Bindings } from './types';
import { registerHealthRoutes } from './routes/health';
import { registerJusoRoutes } from './routes/juso';
import { registerGenerateRoutes } from './routes/generate';
import { registerHistoryRoutes } from './routes/history';
import { registerProfileRoutes } from './routes/profile';
import { registerSubscriptionRoutes } from './routes/subscription';
import { registerStripeRoutes } from './routes/stripe';

export const createApp = () => {
    const app = new Hono<{ Bindings: Bindings }>().basePath('/api');

    app.use(
        '*',
        cors({
            origin: '*',
            allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowHeaders: ['Content-Type', 'Authorization'],
        })
    );

    registerHealthRoutes(app);
    registerJusoRoutes(app);
    registerGenerateRoutes(app);
    registerHistoryRoutes(app);
    registerProfileRoutes(app);
    registerSubscriptionRoutes(app);
    registerStripeRoutes(app);

    return app;
};
