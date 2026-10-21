-- notify-group-activity loads group_prayers and group_prayer_updates with the service role.

GRANT SELECT ON TABLE public.group_prayers TO service_role;
GRANT SELECT ON TABLE public.group_prayer_updates TO service_role;
