import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseClient'
import type { CompanyTeamMember } from '@/types/employer/companyProfile'

type TeamMemberWrite = Partial<Pick<CompanyTeamMember, 'full_name' | 'position' | 'photo_path' | 'sort_order'>>

/**
 * employers.company_team_members (migration 077) is not in database.types.ts until `npm run types:gen`
 * is re-run, so the typed client rejects the table name. Use `supabase` directly after regenerating.
 */
const teamTable = () =>
  (supabase as unknown as SupabaseClient).schema('employers').from('company_team_members')

/** Team members of a company, in display order */
export async function fetchCompanyTeamMembers(companyId: string): Promise<CompanyTeamMember[]> {
  const { data, error } = await teamTable()
    .select('*')
    .eq('company_id', companyId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data ?? []) as CompanyTeamMember[]
}

export async function insertCompanyTeamMember(
  companyId: string,
  values: TeamMemberWrite & { full_name: string },
): Promise<CompanyTeamMember> {
  const { data, error } = await teamTable()
    .insert({ ...values, company_id: companyId })
    .select('*')
    .single()

  if (error) throw error
  return data as CompanyTeamMember
}

export async function updateCompanyTeamMember(id: string, values: TeamMemberWrite): Promise<CompanyTeamMember> {
  const { data, error } = await teamTable().update(values).eq('id', id).select('*').single()

  if (error) throw error
  return data as CompanyTeamMember
}

export async function deleteCompanyTeamMember(id: string): Promise<void> {
  const { error } = await teamTable().delete().eq('id', id)

  if (error) throw error
}
