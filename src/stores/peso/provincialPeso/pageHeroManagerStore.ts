import { ref } from 'vue'
import { defineStore } from 'pinia'
import { siteContentManagerService } from '@/services/peso/provincialPeso/siteContentManagerService'
import { useSiteContentStore } from '@/stores/common/siteContentStore'
import { useToastAlert } from '@/composables/common/useToastAlert'
import { PUBLIC_PAGES, type PageHeroItem, type PageHeroRow, type PublicPage } from '@/types/common/siteContent'

const pageName = (page: PublicPage) => PUBLIC_PAGES.find((item) => item.key === page)?.name ?? page

/** Provincial PESO management of the public pages' banners (system.public_page_heroes, 051). */
export const usePageHeroManagerStore = defineStore('pesoPageHeroManager', () => {
  const toastAlert = useToastAlert()
  const publicSiteContentStore = useSiteContentStore()

  // ─── State ───
  const heroes = ref<PageHeroItem[]>([])
  const isLoading = ref(false)
  const errorMessage = ref<string | null>(null)
  // The page whose photo is being uploaded or removed; one at a time
  const savingImagePage = ref<PublicPage | null>(null)
  // The page whose text is being saved; one at a time
  const savingTextPage = ref<PublicPage | null>(null)

  // ─── UI Flags ───
  const pageToClear = ref<PublicPage | null>(null)

  const replaceHero = (hero: PageHeroItem) => {
    heroes.value = heroes.value.some((item) => item.page === hero.page)
      ? heroes.value.map((item) => (item.page === hero.page ? hero : item))
      : [...heroes.value, hero]
  }

  // Old files are cleaned up best-effort: a leftover file is harmless, a failed save is not
  const removeImagesQuietly = async (paths: (string | null | undefined)[]) => {
    try {
      await siteContentManagerService.removeImages(paths.filter((path): path is string => !!path))
    } catch (error) {
      console.error(error)
    }
  }

  // ─── Actions ───
  async function fetchHeroes(): Promise<void> {
    isLoading.value = true
    errorMessage.value = null
    try {
      heroes.value = await siteContentManagerService.fetchPageHeroes()
    } catch (error: any) {
      errorMessage.value = error.message
      toastAlert.error('Error', error.message)
    } finally {
      isLoading.value = false
    }
  }

  /** Saves the banner text; empty fields are stored as null so the page shows its built-in text. */
  async function saveText(
    page: PublicPage,
    text: Pick<PageHeroRow, 'eyebrow' | 'title' | 'description' | 'image_alt'>,
  ): Promise<boolean> {
    savingTextPage.value = page
    try {
      replaceHero(await siteContentManagerService.updatePageHero(page, text))
      publicSiteContentStore.resetPageHero(page)
      toastAlert.success('Banner saved', `The ${pageName(page)} banner text is updated.`)
      return true
    } catch (error: any) {
      toastAlert.error('Error', error.message)
      return false
    } finally {
      savingTextPage.value = null
    }
  }

  /** Uploads the new photo, points the row at it, then removes the old file. */
  async function replaceImage(page: PublicPage, file: File): Promise<boolean> {
    const previousPath = heroes.value.find((hero) => hero.page === page)?.image_path
    savingImagePage.value = page
    let uploadedPath: string | null = null
    try {
      uploadedPath = await siteContentManagerService.uploadPageHeroImage(page, file)
      replaceHero(await siteContentManagerService.updatePageHero(page, { image_path: uploadedPath }))
      await removeImagesQuietly([previousPath])
      publicSiteContentStore.resetPageHero(page)
      toastAlert.success('Photo updated', `The ${pageName(page)} banner has a new photo.`)
      return true
    } catch (error: any) {
      // The row kept its old photo, so the file uploaded for this save is an orphan
      if (uploadedPath) await removeImagesQuietly([uploadedPath])
      toastAlert.error('Error', error.message)
      return false
    } finally {
      savingImagePage.value = null
    }
  }

  async function clearImage(): Promise<boolean> {
    const page = pageToClear.value
    if (!page) return false
    const previousPath = heroes.value.find((hero) => hero.page === page)?.image_path

    savingImagePage.value = page
    try {
      replaceHero(await siteContentManagerService.updatePageHero(page, { image_path: null }))
      await removeImagesQuietly([previousPath])
      pageToClear.value = null
      publicSiteContentStore.resetPageHero(page)
      toastAlert.success('Photo removed', `The ${pageName(page)} banner now shows the plain band.`)
      return true
    } catch (error: any) {
      toastAlert.error('Error', error.message)
      return false
    } finally {
      savingImagePage.value = null
    }
  }

  // ─── UI Actions ───
  function requestClear(page: PublicPage) {
    pageToClear.value = page
  }

  function cancelClear() {
    if (savingImagePage.value) return
    pageToClear.value = null
  }

  return {
    heroes,
    isLoading,
    errorMessage,
    savingImagePage,
    savingTextPage,
    pageToClear,
    fetchHeroes,
    saveText,
    replaceImage,
    clearImage,
    requestClear,
    cancelClear,
  }
})
