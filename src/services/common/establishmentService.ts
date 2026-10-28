import { supabase } from '@/lib/supabaseClient'
import type {
  EstablishmentFormFields,
  EstablishmentRow,
  EstablishmentSearchResult,
  UnclaimedEstablishmentMatch,
} from '@/types/common/establishment'
import type { CompanyEstablishmentSummary } from '@/types/employer/employerCompletion'

const SEARCH_COLUMNS = 'id, business_name, trade_name, acronym, tin, city_municipality, province, status'
const SEARCH_LIMIT = 20
// Keeps `.in('id', …)` URLs short when looking up many establishments
const IN_FILTER_CHUNK_SIZE = 150

/**
 * Stateless service for NSRP Form 2 (`employers.establishments`).
 * Activity tables (job fairs, LRA, SRA) only store `establishment_id`; PostgREST cannot embed
 * across schemas, so establishments are fetched here and joined in the calling service.
 */
export const establishmentService = {
  /** Every word must match the business name, trade name, acronym or TIN. */
  async searchEstablishments(term: string): Promise<EstablishmentSearchResult[]> {
    // Characters with meaning in PostgREST filters are dropped from the search words
    const words = term.replace(/[,()*%\\]/g, ' ').trim().split(/\s+/).filter(Boolean)
    if (words.length === 0) return []

    let query = supabase.schema('employers').from('establishments').select(SEARCH_COLUMNS)
    for (const word of words) {
      query = query.or(
        `business_name.ilike.%${word}%,trade_name.ilike.%${word}%,acronym.ilike.%${word}%,tin.ilike.%${word}%`
      )
    }

    const { data, error } = await query.order('business_name', { ascending: true }).limit(SEARCH_LIMIT)
    if (error) throw new Error(error.message || 'Failed to search establishments.')
    return data ?? []
  },

  async fetchEstablishmentById(establishmentId: string): Promise<EstablishmentRow> {
    const { data, error } = await supabase
      .schema('employers')
      .from('establishments')
      .select('*')
      .eq('id', establishmentId)
      .maybeSingle()

    if (error) throw new Error(error.message || 'Failed to load establishment.')
    if (!data) throw new Error('Establishment not found.')
    return data
  },

  /** The Form 2 linked to a company account (id and review status only); null until the owner registers it */
  async fetchCompanyEstablishment(companyId: string): Promise<CompanyEstablishmentSummary | null> {
    const { data, error } = await supabase
      .schema('employers')
      .from('establishments')
      .select('id, status')
      .eq('company_id', companyId)
      .maybeSingle()

    if (error) throw new Error(error.message || 'Failed to load the company establishment.')
    return data
  },

  async fetchEstablishmentsByIds(ids: string[]): Promise<Map<string, EstablishmentRow>> {
    const unique = [...new Set(ids)]
    const result = new Map<string, EstablishmentRow>()

    for (let i = 0; i < unique.length; i += IN_FILTER_CHUNK_SIZE) {
      const chunk = unique.slice(i, i + IN_FILTER_CHUNK_SIZE)
      const { data, error } = await supabase.schema('employers').from('establishments').select('*').in('id', chunk)
      if (error) throw new Error(error.message || 'Failed to load establishments.')
      for (const row of data ?? []) result.set(row.id, row)
    }

    return result
  },

  /** Registers a new establishment (PESO-encoded ones start Verified, see guard_establishment_review). */
  async createEstablishment(payload: EstablishmentFormFields): Promise<EstablishmentRow> {
    const { data, error } = await supabase
      .schema('employers')
      .from('establishments')
      .insert(payload)
      .select()
      .single()

    if (error) throw new Error(error.message || 'Failed to register establishment.')
    return data
  },

  /** Saves Form 2 edits; every activity linked to the establishment sees them. */
  async updateEstablishment(establishmentId: string, payload: EstablishmentFormFields): Promise<EstablishmentRow> {
    const { data, error } = await supabase
      .schema('employers')
      .from('establishments')
      .update(payload)
      .eq('id', establishmentId)
      .select()
      .single()

    if (error) throw new Error(error.message || 'Failed to update establishment.')
    return data
  },

  /**
   * Signup, before the account exists: Form 2 records PESO already encoded for this establishment
   * (exact TIN or business name, not yet linked to an account). Migration 074.
   */
  async findUnclaimedEstablishments(tin: string, businessName: string): Promise<UnclaimedEstablishmentMatch[]> {
    // Migration 074's functions are not in database.types.ts until `npm run types:gen` is re-run
    const { data, error } = await (supabase.schema('employers') as any).rpc('find_unclaimed_establishments', {
      p_tin: tin.trim(),
      p_business_name: businessName.trim(),
    })
    if (error) throw new Error(error.message || 'Failed to check existing establishments.')
    return (data ?? []) as UnclaimedEstablishmentMatch[]
  },

  /**
   * Files the new company's Form 2: links the chosen unclaimed record, or creates one (Pending review).
   * Returns the establishment id.
   */
  async registerCompanyEstablishment(
    companyId: string,
    form: EstablishmentFormFields,
    establishmentId: string | null
  ): Promise<string> {
    const { data, error } = await (supabase.schema('employers') as any).rpc('register_company_establishment', {
      p_company_id: companyId,
      p_form: form,
      p_establishment_id: establishmentId,
    })
    if (error) throw new Error(error.message || 'Failed to register the establishment.')
    return data as string
  },
}

