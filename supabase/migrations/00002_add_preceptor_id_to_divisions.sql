ALTER TABLE public.divisions
  ADD COLUMN preceptor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
