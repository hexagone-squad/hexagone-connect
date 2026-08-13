-- Sprint 0 foundation. Each service owns its production schema; this migration
-- is only the minimum platform metadata and must be reviewed before execution.
create schema if not exists platform;
create table if not exists platform.outbox_events (
  event_id uuid primary key,
  event_type text not null,
  event_version integer not null,
  tenant_id uuid not null,
  aggregate_id uuid not null,
  payload jsonb not null,
  occurred_at timestamptz not null,
  published_at timestamptz,
  attempts integer not null default 0
);
