import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import Stripe from 'stripe';
import type { Bindings } from '../types';

export const getSupabase = (env: Bindings) => createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);

export const getSupabaseAdmin = (env: Bindings) =>
    createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

export const getOpenAI = (env: Bindings) => new OpenAI({ apiKey: env.OPENAI_API_KEY });

export const getStripe = (env: Bindings) => new Stripe(env.STRIPE_SECRET_KEY);
