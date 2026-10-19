-- Edge Functions (notify-group-activity) read prayer_groups and prayer_group_members
-- with the service_role JWT. REVOKE ALL FROM PUBLIC in 20261018200000 left those tables
-- without a service_role table grant, so PostgREST returns no rows.

GRANT SELECT ON TABLE public.prayer_groups TO service_role;
GRANT SELECT ON TABLE public.prayer_group_members TO service_role;
