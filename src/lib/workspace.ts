import { supabase } from './supabase';

export type CompanyRole = 'owner' | 'admin' | 'manager' | 'employee';

export type Membership = {
  companyId: string;
  companyName: string;
  role: CompanyRole;
};

export type JobSummary = {
  id: string;
  company_id: string;
  title: string;
  address: string | null;
  status: string;
  scheduled_start: string | null;
};

export async function getMyMemberships(): Promise<Membership[]> {
  const { data, error } = await supabase
    .from('company_members')
    .select('company_id, role, companies(name)')
    .eq('is_active', true);

  if (error) throw error;

  return (data ?? []).map((row: any) => {
    const company = Array.isArray(row.companies) ? row.companies[0] : row.companies;
    return {
      companyId: row.company_id,
      companyName: company?.name ?? 'Company',
      role: row.role as CompanyRole,
    };
  });
}

export async function createCompany(name: string): Promise<string> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Company name is required');

  const { data, error } = await supabase.rpc('create_company', {
    company_name: trimmed,
  });

  if (error) throw error;
  if (typeof data !== 'string' || !data) throw new Error('Unexpected create_company response');
  return data;
}

export async function listJobs(companyId: string): Promise<JobSummary[]> {
  const { data, error } = await supabase
    .from('jobs')
    .select('id, company_id, title, address, status, scheduled_start')
    .eq('company_id', companyId)
    .order('scheduled_start', { ascending: true, nullsFirst: false })
    .limit(100);

  if (error) throw error;
  return (data ?? []) as JobSummary[];
}
