import { supabase } from '@/lib/supabaseClient'
import type { SiteContentPlacement, SiteContentRow } from '@/types/common/siteContent'

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
}
