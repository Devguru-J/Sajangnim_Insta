-- Enable pgvector extension for RAG
create extension if not exists vector;

-- Table: caption_examples (for RAG - real Instagram captions)
create table if not exists public.caption_examples (
    id uuid not null default gen_random_uuid(),
    category text not null,        -- 'cafe', 'restaurant', 'salon'
    hashtag text,                  -- original hashtag used for crawling
    caption text not null,         -- the actual Instagram caption
    likes integer default 0,
    source_url text unique,        -- prevent duplicates
    embedding vector(1536),        -- OpenAI text-embedding-3-small dimension
    created_at timestamp with time zone not null default now(),
    constraint caption_examples_pkey primary key (id)
);

-- Index for vector similarity search
create index if not exists caption_examples_embedding_idx on public.caption_examples
    using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- Index for category filtering
create index if not exists caption_examples_category_idx on public.caption_examples (category);

-- Function to search similar captions
create or replace function match_captions(
    query_embedding vector(1536),
    match_category text,
    match_count int default 3
)
returns table (
    id uuid,
    category text,
    caption text,
    likes integer,
    similarity float
)
language plpgsql
as $$
begin
    return query
    select
        ce.id,
        ce.category,
        ce.caption,
        ce.likes,
        1 - (ce.embedding <=> query_embedding) as similarity
    from caption_examples ce
    where ce.category = match_category
    order by ce.embedding <=> query_embedding
    limit match_count;
end;
$$;
