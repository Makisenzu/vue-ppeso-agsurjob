import { ref } from 'vue'
import { defineStore } from 'pinia'
import { siteContentManagerService } from '@/services/peso/provincialPeso/siteContentManagerService'
import { useSiteContentStore } from '@/stores/common/siteContentStore'
import { useToastAlert } from '@/composables/common/useToastAlert'
import { LANDING_MUNICIPALITIES, type AgsurMunicipality, type MunicipalityLogoItem } from '@/types/common/siteContent'

const municipalityName = (municipality: AgsurMunicipality) =>
  LANDING_MUNICIPALITIES.find((item) => item.key === municipality)?.name ?? municipality

/** Provincial PESO management of the landing page's municipality logos (system.landing_municipality_logos, 050). */
export const useMunicipalityLogoManagerStore = defineStore('pesoMunicipalityLogoManager', () => {
  const toastAlert = useToastAlert()
  const publicSiteContentStore = useSiteContentStore()

  // ─── State ───
  const logos = ref<MunicipalityLogoItem[]>([])
  const isLoading = ref(false)
  const errorMessage = ref<string | null>(null)
  // The municipality whose logo is being uploaded or removed; one at a time
  const savingMunicipality = ref<AgsurMunicipality | null>(null)

  // ─── UI Flags ───
  const municipalityToClear = ref<AgsurMunicipality | null>(null)

  const replaceLogo = (logo: MunicipalityLogoItem) => {
    logos.value = logos.value.some((item) => item.municipality === logo.municipality)
      ? logos.value.map((item) => (item.municipality === logo.municipality ? logo : item))
      : [...logos.value, logo]
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
  async function fetchLogos(): Promise<void> {
    isLoading.value = true
    errorMessage.value = null
    try {
      logos.value = await siteContentManagerService.fetchMunicipalityLogos()
    } catch (error: any) {
      errorMessage.value = error.message
      toastAlert.error('Error', error.message)
    } finally {
      isLoading.value = false
    }
  }

  /** Uploads the new logo, points the row at it, then removes the old file. */
  async function replaceImage(municipality: AgsurMunicipality, file: File): Promise<boolean> {
    const previousPath = logos.value.find((logo) => logo.municipality === municipality)?.image_path
    savingMunicipality.value = municipality
    let uploadedPath: string | null = null
    try {
      uploadedPath = await siteContentManagerService.uploadMunicipalityLogo(municipality, file)
      replaceLogo(await siteContentManagerService.updateMunicipalityLogo(municipality, uploadedPath))
      await removeImagesQuietly([previousPath])
      publicSiteContentStore.resetMunicipalityLogos()
      toastAlert.success('Logo updated', `${municipalityName(municipality)} has a new logo.`)
      return true
    } catch (error: any) {
      // The row kept its old logo, so the file uploaded for this save is an orphan
      if (uploadedPath) await removeImagesQuietly([uploadedPath])
      toastAlert.error('Error', error.message)
      return false
    } finally {
      savingMunicipality.value = null
    }
  }

  async function clearImage(): Promise<boolean> {
    const municipality = municipalityToClear.value
    if (!municipality) return false
    const previousPath = logos.value.find((logo) => logo.municipality === municipality)?.image_path

    savingMunicipality.value = municipality
    try {
      replaceLogo(await siteContentManagerService.updateMunicipalityLogo(municipality, null))
      await removeImagesQuietly([previousPath])
      municipalityToClear.value = null
      publicSiteContentStore.resetMunicipalityLogos()
      toastAlert.success('Logo removed', `${municipalityName(municipality)} now shows the province seal.`)
      return true
    } catch (error: any) {
      toastAlert.error('Error', error.message)
      return false
    } finally {
      savingMunicipality.value = null
    }
  }

  // ─── UI Actions ───
  function requestClear(municipality: AgsurMunicipality) {
    municipalityToClear.value = municipality
  }

  function cancelClear() {
    if (savingMunicipality.value) return
    municipalityToClear.value = null
  }

  return {
    logos,
    isLoading,
    errorMessage,
    savingMunicipality,
    municipalityToClear,
    fetchLogos,
    replaceImage,
    clearImage,
    requestClear,
    cancelClear,
  }
})
