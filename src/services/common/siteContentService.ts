import { supabase } from '@/lib/supabaseClient'
import type { ProgramCardRow, SiteContentPlacement, SiteContentRow } from '@/types/common/siteContent'

// system.landing_program_cards (migration 049) is not in database.types.ts until `npm run types:gen`
// is re-run, so the typed client does not know the table yet. Rows are typed by ProgramCardRow.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const programCardsTable = () => (supabase.schema('system') as any).from('landing_program_cards')

export const siteContentService = {
  /**
   * Live rows of a placement in display order. RLS already limits visitors to live rows, but
   * PESO staff can read drafts too, so the live filter is repeated to keep their landing page public.
   */
  async fetchLive(placement: SiteContentPlacement): Promise<SiteContentRow[]> {
    const now = new Date().toISOString()
    const { data, error } = await supabase
      .schema('system')
      .from('site_contents')
      .select('*')
      .eq('placement', placement)
      .eq('status', 'published')
      .lte('published_at', now)
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .order('sort_order', { ascending: true })
      .order('published_at', { ascending: false })

    if (error) throw new Error(error.message || 'Failed to load page content.')
    return data ?? []
  },

  /** Photos of the PESO Programs gallery; every card is public (RLS, 049). */
  async fetchProgramCards(): Promise<ProgramCardRow[]> {
    const { data, error } = await programCardsTable().select('*')
    if (error) throw new Error(error.message || 'Failed to load the program cards.')
    return (data ?? []) as ProgramCardRow[]
  },
}
