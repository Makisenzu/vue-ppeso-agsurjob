import { ref } from 'vue'
import { defineStore } from 'pinia'
import { siteContentManagerService } from '@/services/peso/provincialPeso/siteContentManagerService'
import { useSiteContentStore } from '@/stores/common/siteContentStore'
import { useToastAlert } from '@/composables/common/useToastAlert'
import { LANDING_PROGRAMS, type LandingProgram, type ProgramCardItem } from '@/types/common/siteContent'

const programLabel = (program: LandingProgram) => LANDING_PROGRAMS.find((item) => item.key === program)?.label ?? program

/** Provincial PESO management of the landing page's PESO Programs photos (system.landing_program_cards, 049). */
export const useProgramCardManagerStore = defineStore('pesoProgramCardManager', () => {
  const toastAlert = useToastAlert()
  const publicSiteContentStore = useSiteContentStore()

  // ─── State ───
  const cards = ref<ProgramCardItem[]>([])
  const isLoading = ref(false)
  const errorMessage = ref<string | null>(null)
  // The card whose photo is being uploaded or removed; one at a time
  const savingProgram = ref<LandingProgram | null>(null)

  // ─── UI Flags ───
  const programToClear = ref<LandingProgram | null>(null)

  const replaceCard = (card: ProgramCardItem) => {
    cards.value = cards.value.some((item) => item.program === card.program)
      ? cards.value.map((item) => (item.program === card.program ? card : item))
      : [...cards.value, card]
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
  async function fetchCards(): Promise<void> {
    isLoading.value = true
    errorMessage.value = null
    try {
      cards.value = await siteContentManagerService.fetchProgramCards()
    } catch (error: any) {
      errorMessage.value = error.message
      toastAlert.error('Error', error.message)
    } finally {
      isLoading.value = false
    }
  }

  /** Uploads the new photo, points the card at it, then removes the old file. */
  async function replaceImage(program: LandingProgram, file: File): Promise<boolean> {
    const previousPath = cards.value.find((card) => card.program === program)?.image_path
    savingProgram.value = program
    let uploadedPath: string | null = null
    try {
      uploadedPath = await siteContentManagerService.uploadProgramCardImage(program, file)
      replaceCard(await siteContentManagerService.updateProgramCardImage(program, uploadedPath))
      await removeImagesQuietly([previousPath])
      publicSiteContentStore.resetProgramCards()
      toastAlert.success('Photo updated', `The ${programLabel(program)} card has a new photo.`)
      return true
    } catch (error: any) {
      // The card kept its old photo, so the file uploaded for this save is an orphan
      if (uploadedPath) await removeImagesQuietly([uploadedPath])
      toastAlert.error('Error', error.message)
      return false
    } finally {
      savingProgram.value = null
    }
  }

  async function clearImage(): Promise<boolean> {
    const program = programToClear.value
    if (!program) return false
    const previousPath = cards.value.find((card) => card.program === program)?.image_path

    savingProgram.value = program
    try {
      replaceCard(await siteContentManagerService.updateProgramCardImage(program, null))
      await removeImagesQuietly([previousPath])
      programToClear.value = null
      publicSiteContentStore.resetProgramCards()
      toastAlert.success('Photo removed', `The ${programLabel(program)} card now shows a plain background.`)
      return true
    } catch (error: any) {
      toastAlert.error('Error', error.message)
      return false
    } finally {
      savingProgram.value = null
    }
  }

  // ─── UI Actions ───
  function requestClear(program: LandingProgram) {
    programToClear.value = program
  }

  function cancelClear() {
    if (savingProgram.value) return
    programToClear.value = null
  }

  return {
    cards,
    isLoading,
    errorMessage,
    savingProgram,
    programToClear,
    fetchCards,
    replaceImage,
    clearImage,
    requestClear,
    cancelClear,
  }
})
