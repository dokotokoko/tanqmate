alter table public.schools
  add column if not exists status text not null default 'active'
    check (status in ('active', 'paused', 'archived')),
  add column if not exists operator_notes text,
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.school_support_tickets (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  category text not null check (category in ('bug', 'support', 'request')),
  severity text not null check (severity in ('low', 'medium', 'high', 'critical')),
  status text not null default 'open' check (status in ('open', 'investigating', 'resolved')),
  title text not null,
  description text not null,
  source text not null default 'manual',
  admin_note text,
  reported_by_user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists idx_school_support_tickets_school_id
  on public.school_support_tickets(school_id);

create index if not exists idx_school_support_tickets_status
  on public.school_support_tickets(status);

create index if not exists idx_school_support_tickets_created_at
  on public.school_support_tickets(created_at desc);
