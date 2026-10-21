import { supabase } from '@/lib/supabaseClient'
import type {
  EstablishmentFormFields,
  EstablishmentRow,
  EstablishmentSearchResult,
} from '@/types/common/establishment'

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
}

