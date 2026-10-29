import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import * as z from 'zod'
import { useAuthStore } from '@/stores/common/auth'
import { useCompanyProfileStore } from '@/stores/employer/companyProfileStore'
import {
  BUSINESS_TYPE_OPTIONS,
  getEmployerCompletionStepSchema,
  normalizeEmployerCompletionValues,
} from '@/helpers/employer/employerCompletionHelper'
import { EMPTY_ESTABLISHMENT_FORM_VALUES, toEstablishmentFormValues } from '@/helpers/common/establishmentHelper'
import type { EmployerCompletionValues } from '@/types/employer/employerCompletion'
import type { CompanyMediaKind, CompanyProfileSection } from '@/types/employer/companyProfile'
import type { MapCoordinates } from '@/helpers/common/mapboxHelpers'

/** Sheet title and description per section */
const SECTION_META: Record<CompanyProfileSection, { title: string; description: string }> = {
  details: {
    title: 'Edit Company Details',
    description: 'Saving sends your NSRP Form 2 back to PESO for review.',
  },
  contact: {
    title: 'Edit Contact & Address',
    description: 'Saving sends your NSRP Form 2 back to PESO for review.',
  },
  about: {
    title: 'Edit About the Company',
    description: 'A short introduction applicants see on your company profile.',
  },
  location: {
    title: 'Edit Company Location',
    description: 'Click the map or drag the pin to your office. This does not change your NSRP Form 2.',
  },
}

const aboutSchema = z.object({
  company_description: z.string().trim().max(1000, 'Maximum of 1000 characters.').optional(),
})

/** Same rules as registering the establishment: the Form 2 halves reuse the completion step schemas */
function sectionSchema(section: CompanyProfileSection) {
  if (section === 'details') return getEmployerCompletionStepSchema('establishment')
  if (section === 'contact') return getEmployerCompletionStepSchema('contact')
  if (section === 'location') return z.object({})
  return aboutSchema
}

/**
 * Per-section editing of the company profile (details, contact & address, about, map pin) and the cover
 * photo and logo. One form holds every value so each save rebuilds the full company row from Form 2.
 */
export function useCompanyProfileEditor() {
  const authStore = useAuthStore()
  const store = useCompanyProfileStore()
  const { isSaving, isUpdatingCover, isUpdatingLogo, establishment } = storeToRefs(store)

  const editingSection = ref<CompanyProfileSection | null>(null)
  const isEditorOpen = computed({
    get: () => editingSection.value !== null,
    set: (open: boolean) => {
      if (!open) editingSection.value = null
    },
  })
  const editorMeta = computed(() => (editingSection.value ? SECTION_META[editingSection.value] : SECTION_META.about))

  const validationSchema = computed(() => toTypedSchema(sectionSchema(editingSection.value ?? 'about')))
  const { handleSubmit, resetForm } = useForm<EmployerCompletionValues>({ validationSchema, keepValuesOnUnmount: true })

  /** Current saved values: Form 2 plus the company fields Form 2 doesn't have */
  function currentValues(): EmployerCompletionValues {
    const company = authStore.employerProfile
    return {
      establishment: establishment.value
        ? toEstablishmentFormValues(establishment.value)
        : { ...EMPTY_ESTABLISHMENT_FORM_VALUES },
      claim_establishment_id: '',
      business_type: company?.business_type ?? '',
      company_description: company?.company_description ?? '',
      website: company?.website ?? '',
      registration_number: company?.registration_number ?? '',
    }
  }

  // ─── Map pin (location section) ───
  const pickedLocation = ref<MapCoordinates | null>(null)
  /** "Find on map" starts from the saved address */
  const locationQuery = computed(() => authStore.employerProfile?.company_address ?? '')

  function setPickedLocation(coordinates: MapCoordinates | null) {
    pickedLocation.value = coordinates
  }

  function openEditor(section: CompanyProfileSection) {
    if (section === 'location') {
      const company = authStore.employerProfile
      pickedLocation.value =
        company?.latitude != null && company?.longitude != null
          ? { latitude: company.latitude, longitude: company.longitude }
          : null
      editingSection.value = section
      return
    }
    // Every save rebuilds the company row from Form 2, so never edit before it has loaded
    if (!establishment.value) return
    resetForm({ values: currentValues() })
    editingSection.value = section
  }

  const saveSection = handleSubmit(async (values) => {
    const section = editingSection.value
    if (!section) return
    if (section === 'location') {
      if (await store.saveLocation(pickedLocation.value)) editingSection.value = null
      return
    }
    // The section schema strips the other sections' fields, so they keep their saved values
    const saved = currentValues()
    const edited = values as Partial<EmployerCompletionValues>
    const merged = normalizeEmployerCompletionValues({
      ...saved,
      ...edited,
      establishment: { ...saved.establishment, ...edited.establishment },
    } as EmployerCompletionValues)
    if (await store.saveSection(section, merged)) editingSection.value = null
  })

  // ─── Cover photo and logo ───
  async function uploadSelected(kind: CompanyMediaKind, event: Event) {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    input.value = ''
    if (file) await store.uploadMedia(kind, file)
  }

  return {
    // Section editing
    editingSection,
    isEditorOpen,
    editorMeta,
    isSaving,
    openEditor,
    saveSection,
    BUSINESS_TYPE_OPTIONS,
    // Map pin
    pickedLocation,
    locationQuery,
    setPickedLocation,
    // Cover photo and logo
    isUpdatingCover,
    isUpdatingLogo,
    onCoverSelected: (event: Event) => uploadSelected('cover', event),
    removeCover: () => store.removeMedia('cover'),
    onLogoSelected: (event: Event) => uploadSelected('logo', event),
    removeLogo: () => store.removeMedia('logo'),
  }
}
