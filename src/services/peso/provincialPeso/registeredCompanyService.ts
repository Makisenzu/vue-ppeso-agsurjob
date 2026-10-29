import { supabase } from '@/lib/supabaseClient'
import type { RegisteredCompanyListItem } from '@/types/peso/provincialPeso/registeredCompany'

const LIST_COLUMNS = `
  id, company_name, company_email, company_contact, created_at,
  establishments (id, business_name, trade_name, tin, industry_line, city_municipality, province, status)
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
}
