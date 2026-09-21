-- READ ONLY. Metadata only; no team, Auth, Storage object or credential rows.
-- Run only through an authorized operator; keep results in restricted audit storage.
begin read only;
select jsonb_build_object(
 'schemas',(select jsonb_agg(nspname order by nspname) from pg_namespace where nspname not like 'pg_%' and nspname<>'information_schema'),
 'tables',(select jsonb_agg(jsonb_build_object('schema',n.nspname,'table',c.relname,'kind',c.relkind,'rls',c.relrowsecurity,'forceRls',c.relforcerowsecurity) order by n.nspname,c.relname) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','aevic','aevic_private','auth','storage','supabase_migrations') and c.relkind in ('r','p','v','m')),
 'columns',(select jsonb_agg(jsonb_build_object('schema',table_schema,'table',table_name,'column',column_name,'type',udt_schema||'.'||udt_name,'nullable',is_nullable,'position',ordinal_position) order by table_schema,table_name,ordinal_position) from information_schema.columns where table_schema in ('public','aevic','aevic_private','auth','storage')),
 'constraints',(select jsonb_agg(jsonb_build_object('schema',n.nspname,'table',c.relname,'name',k.conname,'type',k.contype,'columns',k.conkey,'referencedTable',k.confrelid::regclass::text,'referencedColumns',k.confkey,'definitionHash',md5(pg_get_constraintdef(k.oid))) order by n.nspname,c.relname,k.conname) from pg_constraint k join pg_class c on c.oid=k.conrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','aevic','aevic_private')),
 'indexes',(select jsonb_agg(jsonb_build_object('schema',schemaname,'table',tablename,'name',indexname,'definitionHash',md5(indexdef)) order by schemaname,tablename,indexname) from pg_indexes where schemaname in ('public','aevic','aevic_private')),
 'policies',(select jsonb_agg(jsonb_build_object('schema',schemaname,'table',tablename,'name',policyname,'roles',roles,'command',cmd,'definitionHash',md5(coalesce(qual,'')||coalesce(with_check,''))) order by schemaname,tablename,policyname) from pg_policies where schemaname in ('public','aevic','aevic_private','storage')),
 'triggers',(select jsonb_agg(jsonb_build_object('schema',n.nspname,'table',c.relname,'name',t.tgname,'function',t.tgfoid::regprocedure::text,'enabled',t.tgenabled,'definitionHash',md5(pg_get_triggerdef(t.oid))) order by n.nspname,c.relname,t.tgname) from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where not t.tgisinternal and n.nspname in ('public','auth','aevic','storage')),
 'functions',(select jsonb_agg(jsonb_build_object('schema',n.nspname,'name',p.proname,'arguments',pg_get_function_identity_arguments(p.oid),'definer',p.prosecdef,'settings',p.proconfig,'acl',p.proacl,'bodyHash',md5(p.prosrc)) order by n.nspname,p.proname,p.oid::regprocedure::text) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','aevic','aevic_private') and p.prokind='f'),
 'grants',(select jsonb_agg(jsonb_build_object('schema',table_schema,'table',table_name,'role',grantee,'privilege',privilege_type) order by table_schema,table_name,grantee,privilege_type) from information_schema.table_privileges where table_schema in ('public','aevic','aevic_private','storage')),
 'realtime',(select jsonb_agg(jsonb_build_object('publication',pubname,'schema',schemaname,'table',tablename) order by pubname,schemaname,tablename) from pg_publication_tables)
) as catalog;
rollback;
-- Definition hashes detect changes without exposing embedded literals. An operator
-- must review actual policy/check/trigger/function bodies privately before approval.
-- Separately verify bucket privacy/limits and migration history. Do not SELECT *
-- from auth.users, auth.identities, storage.objects or product tables into logs.
