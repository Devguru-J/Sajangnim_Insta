import type { Hono } from 'hono';
import type { Bindings } from '../types';

export const registerHealthRoutes = (app: Hono<{ Bindings: Bindings }>) => {
    app.get('/health', (c) => c.json({ status: 'ok' }));
};
