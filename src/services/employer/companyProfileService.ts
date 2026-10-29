import { supabase } from '@/lib/supabaseClient'
import type { CompanyMediaKind, CompanyProfileResult } from '@/types/employer/companyProfile'
import type { TablesUpdate } from '@/types/database.types'

/**
 * Fetches the employer record and its linked owner profile for a given
 * profile ID (the auth user's ID that owns the employer record).
 */
export async function fetchCompanyProfileByProfileId(
  profileId: string,
): Promise<CompanyProfileResult> {
  const { data: employer, error: employerError } = await supabase
    .schema('employers')
    .from('companies')
    .select('*')
    .eq('profile_id', profileId)
    .maybeSingle()

  if (employerError) throw employerError

  const { data: ownerProfile, error: profileError } = await supabase
    .schema('core')
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

/** Company columns holding each image's path in the media bucket (migrations 076, 078) */
const MEDIA_COLUMN: Record<CompanyMediaKind, 'cover_photo_path' | 'logo_path'> = {
  cover: 'cover_photo_path',
  logo: 'logo_path',
}

/** Sets (or clears, with null) the company's cover photo or logo path in the media bucket. */
export async function updateCompanyMedia(
  companyId: string,
  kind: CompanyMediaKind,
  filePath: string | null,
): Promise<void> {
  const { error } = await supabase
    .schema('employers')
    .from('companies')
    // Columns added by migrations 076 and 078; the cast goes away once database.types.ts is regenerated
    .update({ [MEDIA_COLUMN[kind]]: filePath } as TablesUpdate<{ schema: 'employers' }, 'companies'>)
    .eq('id', companyId)

  if (error) throw error
}

/**
 * Updates the employer record by its primary key.
 * Only fields present in `updates` are patched.
 */
export async function updateCompanyProfile(
  employerId: string,
  updates: Partial<TablesUpdate<{ schema: 'employers' }, 'companies'>>,
): Promise<void> {
  const { error } = await supabase
    .schema('employers')
    .from('companies')
    .update(updates)
    .eq('id', employerId)
    .select()

  if (error) throw error
}
