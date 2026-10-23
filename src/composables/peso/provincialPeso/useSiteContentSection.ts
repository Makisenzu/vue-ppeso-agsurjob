import { useLocalStorage } from '@vueuse/core'

/**
 * Open / closed state of one collapsible Site Contents section. Remembered per browser, so a section
 * PESO has hidden stays hidden on their next visit; open by default.
 */
export function useSiteContentSection(sectionId: string) {
  const isOpen = useLocalStorage(`site-contents:section:${sectionId}`, true)
  return { isOpen }
}
