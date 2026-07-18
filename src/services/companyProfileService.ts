import { supabase } from '@/lib/supabaseClient'
import type { CompanyProfileResult } from '@/types/companyProfile'
import type { TablesUpdate } from '@/types/database.types'

/**
 * Fetches the employer record and its linked owner profile for a given
 * profile ID (the auth user's ID that owns the employer record).
 */
export async function fetchCompanyProfileByProfileId(
  profileId: string,
): Promise<CompanyProfileResult> {
  const { data: employer, error: employerError } = await supabase
    .from('employers')
    .select('*')
    .eq('profile_id', profileId)
    .maybeSingle()

  if (employerError) throw employerError

  const { data: ownerProfile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', profileId)
    .maybeSingle()

  if (profileError) throw profileError

  return {
    employer,
    ownerProfile,
  }
}

/**
 * Updates the employer record by its primary key.
 * Only fields present in `updates` are patched.
 */
export async function updateCompanyProfile(
  employerId: number,
  updates: Partial<TablesUpdate<'employers'>>,
): Promise<void> {
  const { error } = await supabase
    .from('employers')
    .update(updates)
    .eq('id', employerId)
    .select()

  if (error) throw error
}
