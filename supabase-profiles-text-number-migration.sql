ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS text_number TEXT;

CREATE INDEX IF NOT EXISTS profiles_text_number_idx
  ON public.profiles (text_number);
