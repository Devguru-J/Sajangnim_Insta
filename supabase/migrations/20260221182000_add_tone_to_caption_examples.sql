-- Add tone metadata for tone-aware RAG retrieval
alter table public.caption_examples
add column if not exists tone text;

create index if not exists caption_examples_tone_idx
on public.caption_examples (tone);

-- Replace match function to support optional tone filtering
create or replace function match_captions(
    query_embedding vector(1536),
    match_category text,
    match_count int default 3,
    match_tone text default null
)
returns table (
    id uuid,
    category text,
    tone text,
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
        ce.tone,
        ce.caption,
        ce.likes,
        1 - (ce.embedding <=> query_embedding) as similarity
    from caption_examples ce
    where ce.category = match_category
      and (match_tone is null or ce.tone = match_tone)
    order by ce.embedding <=> query_embedding
    limit match_count;
end;
$$;
