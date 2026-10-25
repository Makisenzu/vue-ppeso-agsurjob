import { supabase } from '@/lib/supabaseClient'
import type {
  MunicipalityLogoRow,
  PageHeroRow,
  ProgramCardRow,
  PublicPage,
  SiteContentPlacement,
  SiteContentRow,
} from '@/types/common/siteContent'

// system.landing_program_cards (migration 049) is not in database.types.ts until `npm run types:gen`
// is re-run, so the typed client does not know the table yet. Rows are typed by ProgramCardRow.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const programCardsTable = () => (supabase.schema('system') as any).from('landing_program_cards')
// Same for system.landing_municipality_logos (migration 050), typed by MunicipalityLogoRow
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const municipalityLogosTable = () => (supabase.schema('system') as any).from('landing_municipality_logos')
// Same for system.public_page_heroes (migration 051), typed by PageHeroRow
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pageHeroesTable = () => (supabase.schema('system') as any).from('public_page_heroes')

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

  /** Logos of the province's municipalities and city; every row is public (RLS, 050). */
  async fetchMunicipalityLogos(): Promise<MunicipalityLogoRow[]> {
    const { data, error } = await municipalityLogosTable().select('*')
    if (error) throw new Error(error.message || 'Failed to load the municipality logos.')
    return (data ?? []) as MunicipalityLogoRow[]
  },

  /** Hero of a public page; every row is public (RLS, 051). Null if the page's row is missing. */
  async fetchPageHero(page: PublicPage): Promise<PageHeroRow | null> {
    const { data, error } = await pageHeroesTable().select('*').eq('page', page).maybeSingle()
    if (error) throw new Error(error.message || 'Failed to load the page banner.')
    return (data as PageHeroRow | null) ?? null
  },
}
