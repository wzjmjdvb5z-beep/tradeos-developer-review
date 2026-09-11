-- Sanitised TradeOS review copy
-- Representative production-style database procedures used for timesheet workflow.

create or replace function private.is_assigned_to_job(target_company uuid, target_job uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.job_assignments ja
    join public.company_members cm on cm.id = ja.member_id
    where ja.company_id = target_company
      and ja.job_id = target_job
      and cm.company_id = target_company
      and cm.user_id = auth.uid()
      and cm.active = true
  );
$$;

-- Employees do not directly write approval-controlled timesheet fields.
revoke insert, update, delete on public.timesheets from authenticated;
grant select on public.timesheets to authenticated;

create or replace function public.create_timesheet(
  target_company uuid,
  target_job uuid,
  start_time timestamptz,
  end_time timestamptz default null,
  entry_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if target_job is null or not private.is_assigned_to_job(target_company, target_job) then
    raise exception 'You are not assigned to this job';
  end if;

  if end_time is not null and end_time < start_time then
    raise exception 'Clock out cannot be before clock in';
  end if;

  insert into public.timesheets(company_id, job_id, user_id, clock_in, clock_out, notes, status)
  values (target_company, target_job, auth.uid(), start_time, end_time, nullif(trim(entry_notes),''), 'draft')
  returning id into new_id;

  return new_id;
end;
$$;

create or replace function public.update_draft_timesheet(
  target_timesheet uuid,
  start_time timestamptz,
  end_time timestamptz default null,
  entry_notes text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  ts public.timesheets%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select * into ts from public.timesheets where id = target_timesheet for update;
  if not found then raise exception 'Timesheet not found'; end if;
  if ts.user_id <> auth.uid() then raise exception 'Not permitted'; end if;
  if ts.status <> 'draft' then raise exception 'Only draft timesheets can be edited'; end if;
  if ts.job_id is null or not private.is_assigned_to_job(ts.company_id, ts.job_id) then
    raise exception 'You are no longer assigned to this job';
  end if;
  if end_time is not null and end_time < start_time then
    raise exception 'Clock out cannot be before clock in';
  end if;

  update public.timesheets
  set clock_in = start_time,
      clock_out = end_time,
      notes = nullif(trim(entry_notes),''),
      updated_at = now()
  where id = target_timesheet;
end;
$$;

create or replace function public.submit_timesheet(target_timesheet uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  ts public.timesheets%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  select * into ts from public.timesheets where id = target_timesheet for update;
  if not found then raise exception 'Timesheet not found'; end if;
  if ts.user_id <> auth.uid() then raise exception 'Not permitted'; end if;
  if ts.status not in ('draft','rejected') then
    raise exception 'Timesheet cannot be submitted from its current state';
  end if;
  if ts.clock_out is null then raise exception 'Clock out is required before submission'; end if;
  if ts.job_id is null or not private.is_assigned_to_job(ts.company_id, ts.job_id) then
    raise exception 'You are not assigned to this job';
  end if;

  update public.timesheets
  set status = 'submitted',
      submitted_at = now(),
      reviewed_by = null,
      reviewed_at = null,
      rejection_reason = null,
      hourly_cost = null,
      updated_at = now()
  where id = target_timesheet;
end;
$$;

create or replace function public.review_timesheet(
  target_timesheet uuid,
  decision text,
  approved_hourly_cost numeric default null,
  reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  ts public.timesheets%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  select * into ts from public.timesheets where id = target_timesheet for update;
  if not found then raise exception 'Timesheet not found'; end if;
  if not private.is_company_admin(ts.company_id) then raise exception 'Manager permission required'; end if;
  if ts.status <> 'submitted' then raise exception 'Only submitted timesheets can be reviewed'; end if;
  if decision not in ('approved','rejected') then raise exception 'Decision must be approved or rejected'; end if;
  if decision = 'approved' and (approved_hourly_cost is null or approved_hourly_cost < 0) then
    raise exception 'Approved hourly cost is required';
  end if;
  if decision = 'rejected' and nullif(trim(reason),'') is null then
    raise exception 'Rejection reason is required';
  end if;

  update public.timesheets
  set status = decision,
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      rejection_reason = case when decision = 'rejected' then trim(reason) else null end,
      hourly_cost = case when decision = 'approved' then approved_hourly_cost else null end,
      updated_at = now()
  where id = target_timesheet;
end;
$$;

revoke all on function public.create_timesheet(uuid,uuid,timestamptz,timestamptz,text) from public, anon;
revoke all on function public.update_draft_timesheet(uuid,timestamptz,timestamptz,text) from public, anon;
revoke all on function public.submit_timesheet(uuid) from public, anon;
revoke all on function public.review_timesheet(uuid,text,numeric,text) from public, anon;

grant execute on function public.create_timesheet(uuid,uuid,timestamptz,timestamptz,text) to authenticated;
grant execute on function public.update_draft_timesheet(uuid,timestamptz,timestamptz,text) to authenticated;
grant execute on function public.submit_timesheet(uuid) to authenticated;
grant execute on function public.review_timesheet(uuid,text,numeric,text) to authenticated;
