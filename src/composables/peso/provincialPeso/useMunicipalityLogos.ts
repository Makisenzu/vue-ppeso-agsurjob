import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useMunicipalityLogoManagerStore } from '@/stores/peso/provincialPeso/municipalityLogoManagerStore'
import { assertMunicipalityLogo } from '@/helpers/peso/provincialPeso/siteContentManagerHelper'
import { LANDING_MUNICIPALITIES, SITE_CONTENT_IMAGE_MAX_MB, type AgsurMunicipality } from '@/types/common/siteContent'

/** "Municipality logos" panel of Site Contents: one logo per LGU of the landing page's municipalities spiral. */
export function useMunicipalityLogos() {
  const store = useMunicipalityLogoManagerStore()
  const { logos, isLoading, errorMessage, savingMunicipality, municipalityToClear } = storeToRefs(store)
  const { fetchLogos, replaceImage, clearImage, requestClear, cancelClear } = store

  // Per-logo validation message for a picked file (wrong type or too large)
  const fileErrors = ref<Partial<Record<AgsurMunicipality, string>>>({})

  /** The fixed LGUs in display order, each with its saved logo (if any). */
  const municipalityLogos = computed(() =>
    LANDING_MUNICIPALITIES.map((municipality) => {
      const logo = logos.value.find((item) => item.municipality === municipality.key)
      return {
        ...municipality,
        imageUrl: logo?.image_url ?? null,
        isSaving: savingMunicipality.value === municipality.key,
        fileError: fileErrors.value[municipality.key] ?? null,
      }
    })
  )

  const selectImage = async (municipality: AgsurMunicipality, event: Event) => {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    input.value = ''
    if (!file) return
    try {
      assertMunicipalityLogo(file)
    } catch (error: any) {
      fileErrors.value = { ...fileErrors.value, [municipality]: error.message }
      return
    }
    fileErrors.value = { ...fileErrors.value, [municipality]: undefined }
    await replaceImage(municipality, file)
  }

  const municipalityToClearName = computed(
    () => LANDING_MUNICIPALITIES.find((municipality) => municipality.key === municipalityToClear.value)?.name ?? ''
  )

  const isClearDialogOpen = computed({
    get: () => municipalityToClear.value !== null,
    set: (open: boolean) => {
      if (!open) cancelClear()
    },
  })

  onMounted(() => {
    void fetchLogos()
  })

  return {
    municipalityLogos,
    isLoading,
    errorMessage,
    isClearing: computed(
      () => savingMunicipality.value !== null && savingMunicipality.value === municipalityToClear.value
    ),
    municipalityToClearName,
    isClearDialogOpen,
    // PNG / WebP first: logos usually need a transparent background
    imageAccept: '.png,.webp,.jpg,.jpeg',
    imageMaxMb: SITE_CONTENT_IMAGE_MAX_MB,
    selectImage,
    requestClear,
    confirmClear: clearImage,
  }
}
