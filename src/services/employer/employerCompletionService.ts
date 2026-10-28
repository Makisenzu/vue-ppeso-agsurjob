import { supabase } from '@/lib/supabaseClient'
import type { CompanyInsert, CompanyRow } from '@/types/employer/employerCompletion'

/** Stateless service for the owner's `employers.companies` row, written when they register Form 2. */
export const employerCompletionService = {
  async insertCompany(company: CompanyInsert): Promise<CompanyRow> {
    const { data, error } = await supabase.schema('employers').from('companies').insert(company).select().single()
    if (error) throw new Error(error.message || 'Failed to save the company.')
    return data
  },

  /** Older accounts already have a company row from signup: it is updated instead of duplicated */
  async updateCompany(companyId: string, company: CompanyInsert): Promise<CompanyRow> {
    const { data, error } = await supabase
      .schema('employers')
      .from('companies')
      .update(company)
      .eq('id', companyId)
      .select()
      .single()
    if (error) throw new Error(error.message || 'Failed to save the company.')
    return data
  },
}
