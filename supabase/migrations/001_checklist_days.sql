-- Checklist completion state per user per day.
-- completed: JSONB object mapping task_id (string) -> boolean.
create table if not exists checklist_days (
  date_key text not null,
  user_id text not null,
  completed jsonb not null default '{}',
  primary key (date_key, user_id)
);

-- Optional: allow RLS but use service role in app so this isn't required.
-- alter table checklist_days enable row level security;
