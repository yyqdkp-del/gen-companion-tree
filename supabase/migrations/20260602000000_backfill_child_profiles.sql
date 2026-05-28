-- 为历史上只有 children、没有 child_profiles 的记录补空档案
INSERT INTO public.child_profiles (child_id, user_id, class_schedule, activities)
SELECT c.id, c.user_id, '{}'::jsonb, '[]'::jsonb
FROM public.children c
LEFT JOIN public.child_profiles cp ON cp.child_id = c.id
WHERE cp.child_id IS NULL;
