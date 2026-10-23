import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useProgramCardManagerStore } from '@/stores/peso/provincialPeso/programCardManagerStore'
import { assertProgramCardPhoto } from '@/helpers/peso/provincialPeso/siteContentManagerHelper'
import { LANDING_PROGRAMS, SITE_CONTENT_IMAGE_MAX_MB, type LandingProgram } from '@/types/common/siteContent'

/** "Program cards" panel of Site Contents: one photo per program of the landing page's PESO Programs gallery. */
export function useProgramCards() {
  const store = useProgramCardManagerStore()
  const { cards, isLoading, errorMessage, savingProgram, programToClear } = storeToRefs(store)
  const { fetchCards, replaceImage, clearImage, requestClear, cancelClear } = store

  // Per-card validation message for a picked file (wrong type or too large)
  const fileErrors = ref<Partial<Record<LandingProgram, string>>>({})

  /** The fixed programs in gallery order, each with its saved photo (if any). */
  const programCards = computed(() =>
    LANDING_PROGRAMS.map((program) => {
      const card = cards.value.find((item) => item.program === program.key)
      return {
        ...program,
        imageUrl: card?.image_url ?? null,
        isSaving: savingProgram.value === program.key,
        fileError: fileErrors.value[program.key] ?? null,
      }
    })
  )

  const selectImage = async (program: LandingProgram, event: Event) => {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    input.value = ''
    if (!file) return
    try {
      assertProgramCardPhoto(file)
    } catch (error: any) {
      fileErrors.value = { ...fileErrors.value, [program]: error.message }
      return
    }
    fileErrors.value = { ...fileErrors.value, [program]: undefined }
    await replaceImage(program, file)
  }

  const programToClearLabel = computed(
    () => LANDING_PROGRAMS.find((program) => program.key === programToClear.value)?.label ?? ''
  )

  const isClearDialogOpen = computed({
    get: () => programToClear.value !== null,
    set: (open: boolean) => {
      if (!open) cancelClear()
    },
  })

  onMounted(() => {
    void fetchCards()
  })

  return {
    programCards,
    isLoading,
    errorMessage,
    isClearing: computed(() => savingProgram.value !== null && savingProgram.value === programToClear.value),
    programToClearLabel,
    isClearDialogOpen,
    imageAccept: '.jpg,.jpeg,.png,.webp',
    imageMaxMb: SITE_CONTENT_IMAGE_MAX_MB,
    selectImage,
    requestClear,
    confirmClear: clearImage,
  }
}
