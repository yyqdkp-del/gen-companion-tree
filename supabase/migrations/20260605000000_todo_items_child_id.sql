ALTER TABLE public.todo_items
  ADD COLUMN IF NOT EXISTS child_id UUID REFERENCES public.children(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS todo_items_child_id_idx ON public.todo_items (child_id);
