-- Sanitised TradeOS review copy
-- Representative audit trigger functions for security-sensitive business changes.

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.audit_events enable row level security;

create policy "admins read audit events" on public.audit_events for select to authenticated
using (private.is_company_admin(company_id));

revoke insert, update, delete on public.audit_events from authenticated, anon;
revoke select on public.audit_events from anon;
grant select on public.audit_events to authenticated;

create or replace function private.audit_timesheet_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    insert into public.audit_events(company_id, actor_user_id, action, target_type, target_id, metadata)
    values (
      new.company_id,
      auth.uid(),
      'timesheet.' || new.status,
      'timesheet',
      new.id,
      jsonb_build_object(
        'from_status', old.status,
        'to_status', new.status,
        'job_id', new.job_id,
        'worker_user_id', new.user_id,
        'reviewed_by', new.reviewed_by
      )
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_audit_timesheet_change on public.timesheets;
create trigger trg_audit_timesheet_change
after update on public.timesheets
for each row execute function private.audit_timesheet_change();

create or replace function private.audit_membership_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  company uuid;
  target uuid;
  details jsonb;
begin
  if tg_op = 'INSERT' then
    company := new.company_id;
    target := new.id;
    details := jsonb_build_object('user_id', new.user_id, 'role', new.role, 'active', new.active);
    insert into public.audit_events(company_id, actor_user_id, action, target_type, target_id, metadata)
    values (company, auth.uid(), 'membership.created', 'company_member', target, details);
    return new;
  elsif tg_op = 'UPDATE' and (new.role is distinct from old.role or new.active is distinct from old.active) then
    company := new.company_id;
    target := new.id;
    details := jsonb_build_object(
      'user_id', new.user_id,
      'old_role', old.role,
      'new_role', new.role,
      'old_active', old.active,
      'new_active', new.active
    );
    insert into public.audit_events(company_id, actor_user_id, action, target_type, target_id, metadata)
    values (company, auth.uid(), 'membership.changed', 'company_member', target, details);
    return new;
  elsif tg_op = 'DELETE' then
    company := old.company_id;
    target := old.id;
    details := jsonb_build_object('user_id', old.user_id, 'role', old.role, 'active', old.active);
    insert into public.audit_events(company_id, actor_user_id, action, target_type, target_id, metadata)
    values (company, auth.uid(), 'membership.deleted', 'company_member', target, details);
    return old;
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_audit_membership_change on public.company_members;
create trigger trg_audit_membership_change
after insert or update or delete on public.company_members
for each row execute function private.audit_membership_change();
