import { supabase } from '@/lib/supabaseClient'
import { mediaService } from '@/services/common/mediaService'
import { buildSiteContentMediaPath } from '@/helpers/peso/provincialPeso/siteContentManagerHelper'
import {
  SITE_CONTENT_MEDIA_BUCKET,
  type SiteContentInsert,
  type SiteContentListItem,
  type SiteContentPlacement,
  type SiteContentRow,
  type SiteContentUpdate,
} from '@/types/common/siteContent'

const toListItem = (row: SiteContentRow): SiteContentListItem => ({
  ...row,
  image_url: row.image_path ? mediaService.getPublicUrl(row.image_path, SITE_CONTENT_MEDIA_BUCKET) : null,
})

/** Provincial PESO / admin management of system.site_contents (RLS: full CRUD for those roles). */
export const siteContentManagerService = {
  /** Every row of a placement, drafts and archived included. */
  async fetchAll(placement: SiteContentPlacement): Promise<SiteContentListItem[]> {
    const { data, error } = await supabase
      .schema('system')
      .from('site_contents')
      .select('*')
      .eq('placement', placement)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message || 'Failed to load site contents.')
    return (data ?? []).map(toListItem)
  },

  async create(payload: SiteContentInsert): Promise<SiteContentListItem> {
    const { data, error } = await supabase
      .schema('system')
      .from('site_contents')
      .insert(payload)
      .select()
      .single()

    if (error) throw new Error(error.message || 'Failed to create the content.')
    return toListItem(data)
  },

  async update(id: string, payload: SiteContentUpdate): Promise<SiteContentListItem> {
    const { data, error } = await supabase
      .schema('system')
      .from('site_contents')
      .update(payload)
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(error.message || 'Failed to update the content.')
    return toListItem(data)
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.schema('system').from('site_contents').delete().eq('id', id)
    if (error) throw new Error(error.message || 'Failed to delete the content.')
  },

  /** Uploads a photo or video under the row's folder (the storage policy requires an existing row id); returns the path. */
  async uploadMedia(contentId: string, file: File): Promise<string> {
    const path = buildSiteContentMediaPath(contentId, file.name)
    const { error } = await supabase.storage
      .from(SITE_CONTENT_MEDIA_BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false })

    if (error) throw new Error(error.message || 'Failed to upload the file.')
    return path
  },

  async removeImages(paths: string[]): Promise<void> {
    if (!paths.length) return
    const { error } = await supabase.storage.from(SITE_CONTENT_MEDIA_BUCKET).remove(paths)
    if (error) throw new Error(error.message || 'Failed to remove the file.')
  },
}
