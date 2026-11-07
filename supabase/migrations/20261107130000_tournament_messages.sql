-- Preserve tournament identity and its name at send time on the existing announcement.
alter table aevic_platform.messages
 add column tournament_id uuid references aevic.tournaments(id) on delete restrict,
 add column tournament_name text;
