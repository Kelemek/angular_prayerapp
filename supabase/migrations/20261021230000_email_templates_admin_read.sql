-- email_templates: reads limited to admins (via admin_write FOR ALL) and service_role.

DROP POLICY IF EXISTS email_templates_select_authenticated ON public.email_templates;
DROP POLICY IF EXISTS "Allow authenticated users to read templates" ON public.email_templates;

GRANT SELECT ON TABLE public.email_templates TO service_role;

-- ROLLBACK
-- GRANT SELECT ON TABLE public.email_templates TO authenticated;
-- CREATE POLICY email_templates_select_authenticated ON public.email_templates FOR SELECT TO authenticated USING (true);
