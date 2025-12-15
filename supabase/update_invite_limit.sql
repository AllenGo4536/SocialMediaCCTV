-- Add max_uses and uses_count to invite_codes
ALTER TABLE public.invite_codes 
ADD COLUMN IF NOT EXISTS max_uses INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS uses_count INTEGER DEFAULT 0;

-- Update existing used codes to have uses_count = 1 (Data Migration)
UPDATE public.invite_codes 
SET uses_count = 1 
WHERE is_used = true;

-- Create invite_usages table for tracking individual usages
CREATE TABLE IF NOT EXISTS public.invite_usages (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    invite_code_id UUID REFERENCES public.invite_codes(id),
    user_id UUID REFERENCES auth.users(id),
    used_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT invite_usages_pkey PRIMARY KEY (id)
);

-- Enable RLS for invite_usages
ALTER TABLE public.invite_usages ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.invite_usages TO service_role;

-- Insert the requested TEST2025 code
INSERT INTO public.invite_codes (code, max_uses, uses_count)
VALUES ('TEST2025', 20, 0)
ON CONFLICT (code) 
DO UPDATE SET max_uses = 20;
