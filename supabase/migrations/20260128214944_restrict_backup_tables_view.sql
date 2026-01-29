-- Restrict access to backup_tables view
-- This view lists all tables in the database and should only be accessible to service_role

-- Revoke public access
REVOKE ALL ON TABLE "public"."backup_tables" FROM "anon";
REVOKE ALL ON TABLE "public"."backup_tables" FROM "authenticated";

-- Only service_role should have access
GRANT SELECT ON TABLE "public"."backup_tables" TO "service_role";
