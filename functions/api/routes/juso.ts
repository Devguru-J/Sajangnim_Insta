import type { Hono } from 'hono';
import type { Bindings } from '../types';

export const registerJusoRoutes = (app: Hono<{ Bindings: Bindings }>) => {
    app.get('/juso', async (c) => {
        const keyword = c.req.query('keyword');
        const currentPage = c.req.query('currentPage') || '1';
        const countPerPage = c.req.query('countPerPage') || '10';

        if (!keyword) {
            return c.json({ error: 'keyword is required' }, 400);
        }

        const params = new URLSearchParams({
            confmKey: c.env.JUSO_API_KEY,
            keyword,
            currentPage,
            countPerPage,
            resultType: 'json',
        });

        try {
            const response = await fetch(
                `https://business.juso.go.kr/addrlink/addrLinkApi.do?${params.toString()}`
            );
            const data = await response.json();
            return c.json(data);
        } catch (error) {
            console.error('Juso API error:', error);
            return c.json({ error: 'Failed to fetch address' }, 500);
        }
    });
};
