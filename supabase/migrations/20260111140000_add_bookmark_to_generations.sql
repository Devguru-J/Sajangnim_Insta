-- Add bookmark column to generations table
ALTER TABLE public.generations 
ADD COLUMN is_bookmarked BOOLEAN DEFAULT FALSE;

-- Create index for bookmarked items (partial index for efficiency)
CREATE INDEX generations_bookmarked_idx 
ON public.generations (visitor_id, is_bookmarked) 
WHERE is_bookmarked = TRUE;

-- Add comment for documentation
COMMENT ON COLUMN public.generations.is_bookmarked IS 'User can bookmark/favorite generations for quick access';
