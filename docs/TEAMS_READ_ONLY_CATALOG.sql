-- REVIEW / INSPECTION ONLY. No DDL, DML, nextval, setval or trigger invocation.
-- Target: nmjjibifcuzjlsvfcaaz. Use an already-authorized catalog-capable connection.
-- Never paste connection credentials into the SQL editor or output.
-- This file has NOT been executed against production.
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout = '10s';
SET LOCAL lock_timeout = '2s';

-- Table owner and RLS flags. No product records are selected.
SELECT current_setting('server_version') AS server_version,
       current_user AS inspection_role,
       c.oid::regclass::text AS relation,
       pg_get_userbyid(c.relowner) AS owner,
       c.relkind, c.relrowsecurity AS rls_enabled,
       c.relforcerowsecurity AS force_rls
FROM pg_class c WHERE c.oid = 'public.teams'::regclass;

-- Effective per-column access includes table, column, PUBLIC and inherited grants.
SELECT r.rolname, a.attname AS column_name,
       has_column_privilege(r.oid,a.attrelid,a.attnum,'SELECT') AS can_select,
       has_column_privilege(r.oid,a.attrelid,a.attnum,'INSERT') AS can_insert,
       has_column_privilege(r.oid,a.attrelid,a.attnum,'UPDATE') AS can_update,
       has_column_privilege(r.oid,a.attrelid,a.attnum,'REFERENCES') AS can_reference
FROM pg_roles r CROSS JOIN pg_attribute a
WHERE r.rolname IN ('anon','authenticated',current_user)
  AND a.attrelid='public.teams'::regclass AND a.attnum>0 AND NOT a.attisdropped
ORDER BY r.rolname,a.attnum;

SELECT r.rolname,r.rolsuper,r.rolbypassrls,r.rolinherit,r.rolcanlogin,
       has_table_privilege(r.oid,'public.teams','SELECT') AS table_select,
       has_table_privilege(r.oid,'public.teams','INSERT') AS table_insert,
       has_table_privilege(r.oid,'public.teams','UPDATE') AS table_update,
       has_table_privilege(r.oid,'public.teams','DELETE') AS table_delete,
       has_table_privilege(r.oid,'public.teams','TRUNCATE') AS table_truncate,
       has_table_privilege(r.oid,'public.teams','TRIGGER') AS table_trigger,
       has_schema_privilege(r.oid,'public','USAGE') AS schema_usage
FROM pg_roles r WHERE r.rolname IN ('anon','authenticated',current_user);

-- ACL sources (including PUBLIC). Empty attacl means no direct column grants,
-- NOT absence of effective privileges. Owner/grantor matters for REVOKE.
SELECT 'table' AS grant_scope,NULL::text AS column_name,
       CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END AS grantee,
       pg_get_userbyid(x.grantor) AS grantor,x.privilege_type,x.is_grantable
FROM pg_class c CROSS JOIN LATERAL aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) x
WHERE c.oid='public.teams'::regclass
UNION ALL
SELECT 'column',a.attname,
       CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,
       pg_get_userbyid(x.grantor),x.privilege_type,x.is_grantable
FROM pg_attribute a CROSS JOIN LATERAL aclexplode(a.attacl) x
WHERE a.attrelid='public.teams'::regclass AND a.attnum>0 AND NOT a.attisdropped
ORDER BY 1,2,3,5;

-- Membership paths from the API roles and inspection role; inspect existing
-- backend role separately if it differs from current_user. No password columns.
WITH RECURSIVE memberships AS (
 SELECT r.oid AS start_oid,r.oid AS role_oid,ARRAY[r.oid] AS path
 FROM pg_roles r WHERE r.rolname IN ('anon','authenticated',current_user)
 UNION ALL
 SELECT m.start_oid,am.roleid,m.path||am.roleid
 FROM memberships m JOIN pg_auth_members am ON am.member=m.role_oid
 WHERE NOT am.roleid=ANY(m.path)
)
SELECT DISTINCT pg_get_userbyid(start_oid) AS starting_role,
       pg_get_userbyid(role_oid) AS reachable_role,
       pg_has_role(start_oid,role_oid,'USAGE') AS inherited_now,
       r.rolsuper,r.rolbypassrls
FROM memberships m JOIN pg_roles r ON r.oid=m.role_oid ORDER BY 1,2;
-- On PostgreSQL 16+, additionally inspect pg_auth_members.inherit_option/set_option
-- for those paths. SET ROLE reachability can matter even without inheritance.

-- Policy commands, roles, permissiveness and expressions. Expressions containing
-- quoted literals are omitted entirely to avoid embedded emails/credentials. No row data.
SELECT p.polname AS policy_name,p.polpermissive AS permissive,
       CASE p.polcmd WHEN 'r' THEN 'SELECT' WHEN 'a' THEN 'INSERT'
                    WHEN 'w' THEN 'UPDATE' WHEN 'd' THEN 'DELETE' ELSE 'ALL' END AS command,
       ARRAY(SELECT CASE WHEN role_oid=0 THEN 'PUBLIC' ELSE pg_get_userbyid(role_oid) END
             FROM unnest(p.polroles) role_oid) AS roles,
       CASE WHEN pg_get_expr(p.polqual,p.polrelid) ~ $rx$['$]$rx$ THEN '[literal-bearing expression omitted]' ELSE pg_get_expr(p.polqual,p.polrelid) END AS using_redacted,
       CASE WHEN pg_get_expr(p.polwithcheck,p.polrelid) ~ $rx$['$]$rx$ THEN '[literal-bearing expression omitted]' ELSE pg_get_expr(p.polwithcheck,p.polrelid) END AS check_redacted,
       md5(coalesce(pg_get_expr(p.polqual,p.polrelid),'')||'/'||coalesce(pg_get_expr(p.polwithcheck,p.polrelid),'')) AS definition_fingerprint
FROM pg_policy p WHERE p.polrelid='public.teams'::regclass ORDER BY p.polname;

-- Types and ID generation. pg_get_serial_sequence finds OWNED BY sequences for
-- serial/default columns and identity columns. NULL does not exclude a trigger
-- or an unowned sequence. Default string literals are redacted.
SELECT a.attname,format_type(a.atttypid,a.atttypmod) AS data_type,
       a.attnotnull,a.attidentity AS identity_kind, -- 'a'=ALWAYS, 'd'=BY DEFAULT, ''=neither
       a.attgenerated,
       CASE WHEN pg_get_expr(d.adbin,d.adrelid) ~ $rx$['$]$rx$ THEN '[literal-bearing expression omitted]' ELSE pg_get_expr(d.adbin,d.adrelid) END AS default_redacted,
       coalesce(pg_get_expr(d.adbin,d.adrelid) ~* '^nextval[(]',false) AS default_calls_nextval,
       CASE WHEN a.attname='id' THEN pg_get_serial_sequence('public.teams','id') END AS owned_sequence
FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
WHERE a.attrelid='public.teams'::regclass AND a.attname IN ('id','password_hash','reset_token')
  AND a.attnum>0 AND NOT a.attisdropped ORDER BY a.attnum;

-- Sequence dependencies of id's DEFAULT, including nextval on an unowned sequence.
SELECT DISTINCT s.oid::regclass::text AS sequence_name,dep.deptype,
       q.seqtypid::regtype::text AS sequence_type,q.seqincrement,q.seqmin,q.seqmax,q.seqcycle
FROM pg_attribute a JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
JOIN pg_depend dep ON dep.classid='pg_attrdef'::regclass AND dep.objid=d.oid
JOIN pg_class s ON dep.refclassid='pg_class'::regclass AND dep.refobjid=s.oid AND s.relkind='S'
JOIN pg_sequence q ON q.seqrelid=s.oid
WHERE a.attrelid='public.teams'::regclass AND a.attname='id';

-- Existing sequence ACL/ownership (no sequence values and no advancement).
WITH sequence_ids AS (
 SELECT pg_get_serial_sequence('public.teams','id')::regclass::oid AS oid
 UNION
 SELECT dep.refobjid FROM pg_attribute a
 JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
 JOIN pg_depend dep ON dep.classid='pg_attrdef'::regclass AND dep.objid=d.oid
 JOIN pg_class s ON dep.refclassid='pg_class'::regclass AND dep.refobjid=s.oid AND s.relkind='S'
 WHERE a.attrelid='public.teams'::regclass AND a.attname='id'
)
SELECT s.oid::regclass::text AS sequence_name,pg_get_userbyid(s.relowner) AS owner,
       CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END AS grantee,
       pg_get_userbyid(x.grantor) AS grantor,x.privilege_type,x.is_grantable
FROM sequence_ids ids JOIN pg_class s ON s.oid=ids.oid
CROSS JOIN LATERAL aclexplode(coalesce(s.relacl,acldefault('S',s.relowner))) x;

-- INSERT triggers may assign NEW.id or call other functions. These flags are
-- discovery hints, NOT proof of function behavior. Never execute trigger functions.
-- Function bodies, trigger arguments, and function settings are deliberately omitted.
SELECT t.tgname,t.tgenabled,(t.tgtype::int & 2)<>0 AS before_trigger,
       (t.tgtype::int & 1)<>0 AS row_trigger,
       p.oid::regprocedure::text AS function_identity,
       pg_get_userbyid(p.proowner) AS function_owner,p.prosecdef AS security_definer,
       p.prosrc ~* $rx$new\s*\.\s*"?id"?$rx$ AS mentions_new_id,
       p.prosrc ~* $rx$\mnextval\M$rx$ AS mentions_nextval,
       md5(p.prosrc) AS body_fingerprint
FROM pg_trigger t JOIN pg_proc p ON p.oid=t.tgfoid
WHERE t.tgrelid='public.teams'::regclass AND NOT t.tgisinternal
  AND (t.tgtype::int & 4)<>0 ORDER BY t.tgname;

-- Catalog-known dependent views and routines need separate review for alternate
-- data exposure / SECURITY DEFINER write paths. Dynamic SQL dependencies may not
-- appear here. Do not dump view rows or function bodies.
SELECT DISTINCT v.oid::regclass::text AS dependent_view,v.relkind,
       pg_get_userbyid(v.relowner) AS owner,
       coalesce('security_invoker=true'=ANY(v.reloptions),false) AS security_invoker,
       has_table_privilege('anon',v.oid,'SELECT') AS anon_select,
       has_table_privilege('authenticated',v.oid,'SELECT') AS authenticated_select
FROM pg_depend d JOIN pg_rewrite rw ON d.classid='pg_rewrite'::regclass AND d.objid=rw.oid
JOIN pg_class v ON v.oid=rw.ev_class
WHERE d.refclassid='pg_class'::regclass AND d.refobjid='public.teams'::regclass
  AND v.oid<>'public.teams'::regclass AND v.relkind IN ('v','m');

SELECT p.oid::regprocedure::text AS function_identity,p.prosecdef,
       pg_get_userbyid(p.proowner) AS owner,
       has_function_privilege('anon',p.oid,'EXECUTE') AS anon_execute,
       has_function_privilege('authenticated',p.oid,'EXECUTE') AS authenticated_execute,
       md5(p.prosrc) AS body_fingerprint
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.prokind='f'
  AND (p.prosecdef OR EXISTS(SELECT 1 FROM pg_depend d
       WHERE d.classid='pg_proc'::regclass AND d.objid=p.oid
         AND d.refclassid='pg_class'::regclass AND d.refobjid='public.teams'::regclass));
ROLLBACK;

-- Optional separate READ ONLY checks, after reviewing the policies for side
-- effects in called functions, with an authorized role that can SET ROLE anon:
-- BEGIN READ ONLY;
-- SET LOCAL ROLE anon;
-- SELECT id::text FROM public.teams ORDER BY id; -- expected 2,7,8,9,10,12,16
-- ROLLBACK;
-- Repeat with authenticated only through an authorized connection. No sensitive
-- field values are required. No INSERT/UPDATE tests and no sequence advancement.
