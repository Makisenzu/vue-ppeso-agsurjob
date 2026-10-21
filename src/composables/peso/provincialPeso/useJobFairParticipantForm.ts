import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { useDebounceFn } from '@vueuse/core'
import * as z from 'zod'
import { useJobFairParticipantStore } from '@/stores/peso/provincialPeso/jobFairParticipantStore'
import { establishmentService } from '@/services/common/establishmentService'
import { useToastAlert } from '@/composables/common/useToastAlert'
import type { EstablishmentFormFields, EstablishmentSearchResult } from '@/types/common/establishment'
import {
  EMPLOYER_CATEGORIES,
  PARTICIPANT_STATUSES,
  PRIVATE_EMPLOYER_TYPES,
  PUBLIC_EMPLOYER_TYPES,
  TOTAL_WORKFORCE_OPTIONS,
  type JobFairParticipantFormPayload,
} from '@/types/peso/provincialPeso/jobFair'

const optionalText = z.string().trim().optional()

const participantSchema = toTypedSchema(
  z.object({
    businessName: z.string().trim().min(1, 'Business name is required.'),
    tradeName: optionalText,
    acronym: optionalText,
    employerCategory: z.enum(EMPLOYER_CATEGORIES),
    publicEmployerType: z.enum(PUBLIC_EMPLOYER_TYPES).optional(),
    privateEmployerType: z.enum(PRIVATE_EMPLOYER_TYPES).optional(),
    industryLine: optionalText,
    totalWorkforce: z.enum(TOTAL_WORKFORCE_OPTIONS).optional(),
    tin: optionalText,
    ownerPresidentName: optionalText,
    contactPersonName: optionalText,
    contactPersonPosition: optionalText,
    emailAddress: z.union([z.literal(''), z.string().trim().email('Enter a valid email address.')]).optional(),
    mobileNumber: optionalText,
    telephoneNumber: optionalText,
    faxNumber: optionalText,
    street: optionalText,
    barangay: optionalText,
    cityMunicipality: optionalText,
    province: optionalText,
    isMainOffice: z.boolean(),
    status: z.string().optional(),
  })
)

type ParticipantFormValues = {
  businessName: string
  tradeName: string
  acronym: string
  employerCategory: (typeof EMPLOYER_CATEGORIES)[number]
  publicEmployerType: (typeof PUBLIC_EMPLOYER_TYPES)[number] | undefined
  privateEmployerType: (typeof PRIVATE_EMPLOYER_TYPES)[number] | undefined
  industryLine: string
  totalWorkforce: (typeof TOTAL_WORKFORCE_OPTIONS)[number] | undefined
  tin: string
  ownerPresidentName: string
  contactPersonName: string
  contactPersonPosition: string
  emailAddress: string
  mobileNumber: string
  telephoneNumber: string
  faxNumber: string
  street: string
  barangay: string
  cityMunicipality: string
  province: string
  isMainOffice: boolean
  status: string | undefined
}

const INITIAL_VALUES: ParticipantFormValues = {
  businessName: '',
  tradeName: '',
  acronym: '',
  employerCategory: 'Private',
  publicEmployerType: undefined,
  privateEmployerType: undefined,
  industryLine: '',
  totalWorkforce: undefined,
  tin: '',
  ownerPresidentName: '',
  contactPersonName: '',
  contactPersonPosition: '',
  emailAddress: '',
  mobileNumber: '',
  telephoneNumber: '',
  faxNumber: '',
  street: '',
  barangay: '',
  cityMunicipality: '',
  province: 'Agusan del Sur',
  isMainOffice: true,
  status: 'Registered',
}

const ESTABLISHMENT_SEARCH_MIN_LENGTH = 2

function toFormValues(row: EstablishmentFormFields, status: string | null): ParticipantFormValues {
  return {
    businessName: row.business_name,
    tradeName: row.trade_name ?? '',
    acronym: row.acronym ?? '',
    employerCategory: row.employer_category,
    publicEmployerType: row.public_employer_type ?? undefined,
    privateEmployerType: row.private_employer_type ?? undefined,
    industryLine: row.industry_line ?? '',
    totalWorkforce: row.total_workforce ?? undefined,
    tin: row.tin ?? '',
    ownerPresidentName: row.owner_president_name ?? '',
    contactPersonName: row.contact_person_name ?? '',
    contactPersonPosition: row.contact_person_position ?? '',
    emailAddress: row.email_address ?? '',
    mobileNumber: row.mobile_number ?? '',
    telephoneNumber: row.telephone_number ?? '',
    faxNumber: row.fax_number ?? '',
    street: row.street ?? '',
    barangay: row.barangay ?? '',
    cityMunicipality: row.city_municipality ?? '',
    province: row.province ?? '',
    isMainOffice: row.is_main_office ?? true,
    status: status ?? undefined,
  }
}

const orNull = (value?: string | null) => (value && value.trim() ? value.trim() : null)

export function useJobFairParticipantForm() {
  const store = useJobFairParticipantStore()
  const { jobFair, isFormDialogOpen, editingParticipant, isSubmitting } = storeToRefs(store)
  const { createParticipant, updateParticipant, closeFormDialog } = store
  const toastAlert = useToastAlert()

  const { handleSubmit, resetForm, values } = useForm({
    validationSchema: participantSchema,
    initialValues: INITIAL_VALUES,
  })

  const isEditMode = computed(() => editingParticipant.value !== null)
  const isPublicEmployer = computed(() => values.employerCategory === 'Public')

  // ─── Existing establishment (NSRP Form 2) picker, add mode only ───
  const establishmentQuery = ref('')
  const establishmentResults = ref<EstablishmentSearchResult[]>([])
  const isSearchingEstablishments = ref(false)
  const isLoadingEstablishment = ref(false)
  const selectedEstablishment = ref<EstablishmentSearchResult | null>(null)

  const runEstablishmentSearch = useDebounceFn(async (term: string) => {
    if (term.trim().length < ESTABLISHMENT_SEARCH_MIN_LENGTH) {
      establishmentResults.value = []
      return
    }
    isSearchingEstablishments.value = true
    try {
      const results = await establishmentService.searchEstablishments(term)
      // Ignore results of a query the user has already changed
      if (term === establishmentQuery.value) establishmentResults.value = results
    } catch (error: any) {
      toastAlert.error('Error', error.message)
    } finally {
      isSearchingEstablishments.value = false
    }
  }, 300)

  watch(establishmentQuery, (term) => void runEstablishmentSearch(term))

  /** Fills the form with the picked establishment; saving updates that record instead of creating one. */
  const selectEstablishment = async (result: EstablishmentSearchResult) => {
    isLoadingEstablishment.value = true
    try {
      const establishment = await establishmentService.fetchEstablishmentById(result.id)
      resetForm({ values: toFormValues(establishment, values.status ?? INITIAL_VALUES.status ?? null) })
      selectedEstablishment.value = result
      establishmentQuery.value = ''
      establishmentResults.value = []
    } catch (error: any) {
      toastAlert.error('Error', error.message)
    } finally {
      isLoadingEstablishment.value = false
    }
  }

  const clearSelectedEstablishment = () => {
    selectedEstablishment.value = null
    resetForm({ values: INITIAL_VALUES })
  }

  // Load the selected row (or blank values) each time the dialog opens.
  watch(isFormDialogOpen, (open) => {
    if (!open) return
    selectedEstablishment.value = null
    establishmentQuery.value = ''
    establishmentResults.value = []
    const editing = editingParticipant.value
    resetForm({ values: editing ? toFormValues(editing, editing.status) : INITIAL_VALUES })
  })

  const onFormDialogOpenChange = (open: boolean) => {
    if (open || isSubmitting.value) return
    closeFormDialog()
  }

  const submitParticipant = handleSubmit(async (formValues) => {
    if (!jobFair.value) return

    const isPublic = formValues.employerCategory === 'Public'
    const establishment: EstablishmentFormFields = {
      business_name: formValues.businessName,
      trade_name: orNull(formValues.tradeName),
      acronym: orNull(formValues.acronym),
      employer_category: formValues.employerCategory,
      // Only the type matching the selected category is kept.
      public_employer_type: isPublic ? (formValues.publicEmployerType ?? null) : null,
      private_employer_type: isPublic ? null : (formValues.privateEmployerType ?? null),
      industry_line: orNull(formValues.industryLine),
      total_workforce: formValues.totalWorkforce ?? null,
      tin: orNull(formValues.tin),
      owner_president_name: orNull(formValues.ownerPresidentName),
      contact_person_name: orNull(formValues.contactPersonName),
      contact_person_position: orNull(formValues.contactPersonPosition),
      email_address: orNull(formValues.emailAddress),
      mobile_number: orNull(formValues.mobileNumber),
      telephone_number: orNull(formValues.telephoneNumber),
      fax_number: orNull(formValues.faxNumber),
      street: orNull(formValues.street),
      barangay: orNull(formValues.barangay),
      city_municipality: orNull(formValues.cityMunicipality),
      province: orNull(formValues.province),
      is_main_office: formValues.isMainOffice,
    }
    const payload: JobFairParticipantFormPayload = { establishment, status: orNull(formValues.status) }

    if (editingParticipant.value) {
      await updateParticipant(editingParticipant.value, payload)
    } else {
      await createParticipant(jobFair.value.id, payload, selectedEstablishment.value?.id ?? null)
    }
  })

  return {
    isFormDialogOpen,
    isSubmitting,
    isEditMode,
    isPublicEmployer,
    onFormDialogOpenChange,
    submitParticipant,
    establishmentQuery,
    establishmentResults,
    isSearchingEstablishments,
    isLoadingEstablishment,
    selectedEstablishment,
    selectEstablishment,
    clearSelectedEstablishment,
    establishmentSearchMinLength: ESTABLISHMENT_SEARCH_MIN_LENGTH,
    categoryOptions: EMPLOYER_CATEGORIES,
    publicTypeOptions: PUBLIC_EMPLOYER_TYPES,
    privateTypeOptions: PRIVATE_EMPLOYER_TYPES,
    workforceOptions: TOTAL_WORKFORCE_OPTIONS,
    statusOptions: PARTICIPANT_STATUSES,
  }
}
