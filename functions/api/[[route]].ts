import { handle } from 'hono/cloudflare-pages';
import { createApp } from './app';

export const onRequest = handle(createApp());
