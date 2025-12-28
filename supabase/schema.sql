-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Table: generations
create table public.generations (
    id uuid not null default uuid_generate_v4(),
    visitor_id text not null,
    industry text not null, -- 'cafe', 'salon', etc.
    tone text not null,    -- 'emotional', 'casual', 'professional'
    goal text not null,    -- 'visit', 'reservation', 'new_menu', 'event'
    input_text text,
    result_json jsonb,     -- stores the API response ({caption, story, etc.})
    created_at timestamp with time zone not null default now(),
    constraint generations_pkey primary key (id)
);

-- Indexes for generations
create index generations_visitor_id_idx on public.generations (visitor_id);
create index generations_created_at_idx on public.generations (created_at);

-- Table: subscriptions (or entitlements)
create table public.subscriptions (
    id uuid not null default uuid_generate_v4(),
    visitor_id text not null,
    stripe_customer_id text,
    stripe_subscription_id text,
    status text not null default 'inactive', -- 'active', 'inactive', 'past_due'
    current_period_end timestamp with time zone,
    created_at timestamp with time zone not null default now(),
    constraint subscriptions_pkey primary key (id)
);

-- Indexes for subscriptions
create index subscriptions_visitor_id_idx on public.subscriptions (visitor_id);
create index subscriptions_stripe_sub_id_idx on public.subscriptions (stripe_subscription_id);

-- RLS Policies (Optional for MVP if we use Service Role mostly, but good practice)
alter table public.generations enable row level security;
alter table public.subscriptions enable row level security;

-- Allow anon read/insert if matching visitor_id (simulated) or just open for MVP API usage?
-- For MVP, we likely use Server Actions / API Routes with Service Role mostly for writing.
-- But if client reads, we need policies. Let's keep it simple: server-side heavy.
