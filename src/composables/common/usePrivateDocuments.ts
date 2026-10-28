import { reactive, watch, type WatchSource } from 'vue'
import { supportingDocumentService } from '@/services/common/supportingDocumentService'
import { useToastAlert } from '@/composables/common/useToastAlert'

/**
 * Files in the private `documents` bucket (IDs, TORs, resumes) open only through short-lived signed
 * URLs, never public ones (PRIVACY.md §4, migration 073).
 */
export function usePrivateDocuments() {
  const toastAlert = useToastAlert()

  /** Opens the file in a new tab. Call it straight from a click handler so popup blockers allow it. */
  async function openDocument(path: string | null | undefined) {
    if (!path) return
    try {
      await supportingDocumentService.openInNewTab(path)
    } catch {
      toastAlert.error('Document unavailable', 'The file could not be opened. Please try again.')
    }
  }

  /** Saves the file under its original name. */
  async function downloadDocument(path: string | null | undefined, fileName: string) {
    if (!path) return
    try {
      const url = await supportingDocumentService.createSignedUrl(path)
      const response = await fetch(url)
      if (!response.ok) throw new Error('Download failed')
      const objectUrl = URL.createObjectURL(await response.blob())
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      link.remove()
      setTimeout(() => URL.revokeObjectURL(objectUrl), 5000)
    } catch {
      toastAlert.error('Download failed', 'The file could not be downloaded. Please try again.')
    }
  }

  return { openDocument, downloadDocument }
}

/**
 * Signed URLs for a changing set of document paths, signed in one request whenever new paths
 * appear. Read a URL with `urls[path]`; it is missing until signed (or if signing failed).
 */
export function useSignedDocumentUrls(paths: WatchSource<string[]>) {
  const urls = reactive<Record<string, string>>({})

  watch(
    paths,
    async (current) => {
      const unsigned = [...new Set(current.filter((path) => path && !urls[path]))]
      if (!unsigned.length) return
      try {
        Object.assign(urls, await supportingDocumentService.createSignedUrls(unsigned))
      } catch {
        // The file stays attached; only its preview link is missing
      }
    },
    { immediate: true }
  )

  return urls
}
