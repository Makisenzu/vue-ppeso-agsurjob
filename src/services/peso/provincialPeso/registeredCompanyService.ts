import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseClient'
import type { RegisteredCompanyListItem } from '@/types/peso/provincialPeso/registeredCompany'

const LIST_COLUMNS = `
  id, company_name, company_email, company_contact, created_at, verification_status,
  establishments (id, business_name, trade_name, tin, industry_line, city_municipality, province)
`

/**
 * Company accounts registered through the system (employers.companies), each with the NSRP Form 2
 * it filed or linked at signup. PESO-encoded establishments without an account are not included.
 */
export const registeredCompanyService = {
  async fetchCompanies(): Promise<RegisteredCompanyListItem[]> {
    const { data, error } = await supabase
      .schema('employers')
      .from('companies')
      .select(LIST_COLUMNS)
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message || 'Failed to load registered companies.')
    return (data ?? []) as RegisteredCompanyListItem[]
  },

  /** Why PESO rejected the company (companies.verification_remarks, migration 079) */
  async fetchVerificationRemarks(companyId: string): Promise<string | null> {
    const { data, error } = await (supabase as unknown as SupabaseClient)
      .schema('employers')
      .from('companies')
      .select('verification_remarks')
      .eq('id', companyId)
      .maybeSingle()

    if (error) throw new Error(error.message || 'Failed to load the company status.')
    return (data as { verification_remarks: string | null } | null)?.verification_remarks ?? null
  },
}
