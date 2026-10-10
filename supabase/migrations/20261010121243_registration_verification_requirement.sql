-- Apply before deploying the registration verification requirement.
-- Existing accounts retain access without falsely marking their email verified.
alter table aevic_platform.accounts add column verification_required boolean not null default false;
alter table aevic_platform.accounts alter column verification_required set default true;
