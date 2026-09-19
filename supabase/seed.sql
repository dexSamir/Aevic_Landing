-- DEVELOPMENT ONLY: run explicitly against a disposable local Supabase database.
-- No Auth users or passwords are seeded. Register through the local Auth API.
insert into aevic.tournaments(id,slug,name,short_name,status,starts_at,ends_at,registration_opens_at,registration_deadline,check_in_opens_at,check_in_closes_at,max_slots,rules)
values('10000000-0000-4000-8000-000000000001','local-training-cup','Lokal məşq turniri','Məşq','registration-open',now()+interval '2 days',now()+interval '3 days',now()-interval '1 day',now()+interval '1 day',now()+interval '1 day',now()+interval '2 days',20,array['Yalnız lokal inkişaf üçün test turniri']) on conflict do nothing;
insert into aevic.matches(tournament_id,round,map,scheduled_at,room_release_at) select id,1,'Erangel',starts_at,starts_at-interval '10 minutes' from aevic.tournaments where id='10000000-0000-4000-8000-000000000001' on conflict do nothing;
