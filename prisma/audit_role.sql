-- PostgreSQL Security Role for Audit Append-Only Compliance (FR-AUD-004, NFR-SEC-010)
-- Prevents UPDATE and DELETE operations on audit_logs even if application code is compromised.

-- 1. Create dedicated application role if not existing
DO $$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'verisync_app') THEN
      CREATE ROLE verisync_app WITH LOGIN PASSWORD 'verisync_secure_app_password';
   END IF;
END
$$;

-- 2. Grant CRUD to application tables
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO verisync_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO verisync_app;

-- 3. Explicitly enforce APPEND-ONLY on audit_logs table (FR-AUD-004)
-- The application user can INSERT and SELECT audit records, but CANNOT UPDATE, DELETE, or TRUNCATE.
REVOKE UPDATE, DELETE, TRUNCATE ON TABLE audit_logs FROM verisync_app;
GRANT INSERT, SELECT ON TABLE audit_logs TO verisync_app;

-- 4. Set future table privileges to prevent privilege escalation
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO verisync_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO verisync_app;
