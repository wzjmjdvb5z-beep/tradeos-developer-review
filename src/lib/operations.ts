import { supabase } from './supabase';
import type { CompanyRole } from './workspace';

export type TimesheetStatus = 'draft' | 'submitted' | 'approved' | 'rejected';

export type TimesheetSummary = {
  id: string;
  company_id: string;
  job_id: string;
  user_id: string;
  clock_in: string;
  clock_out: string | null;
  status: TimesheetStatus;
};

export const canManageCompany = (role: CompanyRole) =>
  role === 'owner' || role === 'admin' || role === 'manager';

export async function createJob(companyId: string, title: string, address?: string) {
  const payload = {
    company_id: companyId,
    title: title.trim(),
    address: address?.trim() || null,
  };
  if (!payload.title) throw new Error('Job title is required');

  const { data, error } = await supabase
    .from('jobs')
    .insert(payload)
    .select('id')
    .single();

  if (error) throw error;
  return data.id as string;
}

export async function listCompanyMembers(companyId: string) {
  const { data, error } = await supabase
    .from('company_members')
    .select('id, company_id, user_id, role, is_active')
    .eq('company_id', companyId)
    .eq('is_active', true);

  if (error) throw error;
  return data ?? [];
}

export async function assignMemberToJob(jobId: string, memberId: string) {
  const { error } = await supabase.from('job_assignments').insert({
    job_id: jobId,
    company_member_id: memberId,
  });
  if (error) throw error;
}

export async function listMyTimesheets(companyId: string): Promise<TimesheetSummary[]> {
  const { data, error } = await supabase
    .from('timesheets')
    .select('id, company_id, job_id, user_id, clock_in, clock_out, status')
    .eq('company_id', companyId)
    .order('clock_in', { ascending: false });

  if (error) throw error;
  return (data ?? []) as TimesheetSummary[];
}

export async function createTimesheet(jobId: string, clockIn: string) {
  const { data, error } = await supabase.rpc('create_timesheet', {
    target_job_id: jobId,
    start_time: clockIn,
  });
  if (error) throw error;
  return data as string;
}

export async function updateDraftTimesheet(timesheetId: string, clockIn: string, clockOut: string | null) {
  const { error } = await supabase.rpc('update_draft_timesheet', {
    target_timesheet_id: timesheetId,
    new_clock_in: clockIn,
    new_clock_out: clockOut,
  });
  if (error) throw error;
}

export async function submitTimesheet(timesheetId: string) {
  const { error } = await supabase.rpc('submit_timesheet', {
    target_timesheet_id: timesheetId,
  });
  if (error) throw error;
}

export async function reviewTimesheet(timesheetId: string, decision: 'approved' | 'rejected', rejectionReason?: string) {
  const { error } = await supabase.rpc('review_timesheet', {
    target_timesheet_id: timesheetId,
    review_decision: decision,
    rejection_reason: rejectionReason ?? null,
  });
  if (error) throw error;
}
