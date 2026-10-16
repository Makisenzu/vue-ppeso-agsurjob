import { supabase } from '@/lib/supabaseClient'
import { DOCUMENT_UPLOAD_BUCKET } from '@/helpers/common/uploadHelpers'

const SIGNED_URL_TTL_SECONDS = 60 * 60

/**
 * Supporting documents (training certificates, licenses) attached to NSRP entries.
 * The 'documents' bucket is private: the owner reads their own folder and PESO / admin staff read
 * any file (storage policies, migration 014), so files are opened through short-lived signed URLs.
 */
export const supportingDocumentService = {
  async createSignedUrl(path: string): Promise<string> {
    const { data, error } = await supabase.storage
      .from(DOCUMENT_UPLOAD_BUCKET)
      .createSignedUrl(path, SIGNED_URL_TTL_SECONDS)

    if (error || !data?.signedUrl) throw new Error(error?.message || 'Failed to open the document')
    return data.signedUrl
  },

  /** Opens the document in a new tab. Call it straight from a click handler so popup blockers allow it. */
  async openInNewTab(path: string): Promise<void> {
    // The tab is opened before the await (still inside the click), then pointed at the signed URL
    const tab = window.open('', '_blank')
    try {
      const url = await this.createSignedUrl(path)
      if (tab) {
        tab.opener = null
        tab.location.href = url
      } else {
        window.location.assign(url)
      }
    } catch (error) {
      tab?.close()
      throw error
    }
  },
}
