import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { useDebounceFn } from '@vueuse/core'
import * as z from 'zod'
import { useRecruitmentActivityStore } from '@/stores/peso/provincialPeso/recruitmentActivityStore'
import { establishmentService } from '@/services/common/establishmentService'
import { useToastAlert } from '@/composables/common/useToastAlert'
import { parseRepresentatives } from '@/helpers/peso/provincialPeso/recruitmentActivityHelper'
import {
  EMPTY_ESTABLISHMENT_FORM_VALUES,
  establishmentFormShape,
  refineCompleteEstablishmentForm,
  toEstablishmentFormFields,
  toEstablishmentFormValues,
} from '@/helpers/common/establishmentHelper'
import type { EstablishmentFormValues, EstablishmentSearchResult } from '@/types/common/establishment'
import {
  RECRUITMENT_ACTIVITY_TYPE_LABELS,
  RECRUITMENT_ACTIVITY_TYPES,
  type RecruitmentActivityFormPayload,
  type RecruitmentActivityListItem,
} from '@/types/peso/provincialPeso/recruitmentActivity'

const optionalText = z.string().trim().optional()
const ESTABLISHMENT_SEARCH_MIN_LENGTH = 2

const activitySchema = toTypedSchema(
  z
    .object({
      type: z.enum(RECRUITMENT_ACTIVITY_TYPES),
      agencyMode: z.enum(['existing', 'new']),
      // True while the agency's NSRP Form 2 is on screen (create mode, agency picked or new)
      form2Visible: z.boolean(),
      ...establishmentFormShape,
      representatives: z.string().trim().min(1, 'Add at least one representative.'),
      startDate: z.string().min(1, 'Start date is required.'),
      endDate: z.string().min(1, 'End date is required.'),
      venue: optionalText,
      venueCityMunicipality: optionalText,
      remarks: optionalText,
    })
    .superRefine((values, ctx) => {
      // An activity can only be created with a complete NSRP Form 2
      if (values.form2Visible) refineCompleteEstablishmentForm(values, ctx)
      if (values.startDate && values.endDate && values.endDate < values.startDate) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['endDate'], message: 'End date cannot be before the start date.' })
      }
    })
)

type ActivityFormValues = EstablishmentFormValues & {
  type: (typeof RECRUITMENT_ACTIVITY_TYPES)[number]
  agencyMode: 'existing' | 'new'
  form2Visible: boolean
  representatives: string
  startDate: string
  endDate: string
  venue: string
  venueCityMunicipality: string
  remarks: string
}

const INITIAL_VALUES: ActivityFormValues = {
  ...EMPTY_ESTABLISHMENT_FORM_VALUES,
  type: 'LRA',
  agencyMode: 'existing',
  form2Visible: false,
  representatives: '',
  startDate: '',
  endDate: '',
  venue: '',
  venueCityMunicipality: '',
  remarks: '',
}

function toFormValues(row: RecruitmentActivityListItem): ActivityFormValues {
  return {
    ...INITIAL_VALUES,
    type: row.type as ActivityFormValues['type'],
    representatives: row.representatives.join('\n'),
    startDate: row.start_date,
    endDate: row.end_date,
    venue: row.venue ?? '',
    venueCityMunicipality: row.city_municipality ?? '',
    remarks: row.remarks ?? '',
  }
}

/** Blank Form 2 for a new agency; overseas activities are run by overseas recruitment agencies. */
function blankForm2(type: ActivityFormValues['type']): EstablishmentFormValues {
  return {
    ...EMPTY_ESTABLISHMENT_FORM_VALUES,
    privateEmployerType: type === 'SRA' ? 'Overseas Recruitment Agency' : undefined,
  }
}

const orNull = (value?: string | null) => (value && value.trim() ? value.trim() : null)

export function useRecruitmentActivityForm() {
  const router = useRouter()
  const toastAlert = useToastAlert()
  const store = useRecruitmentActivityStore()
  const { isFormDialogOpen, editingActivity, isSubmitting } = storeToRefs(store)
  const { createActivity, updateActivity, closeFormDialog } = store

  const { handleSubmit, resetForm, values, setFieldValue, setValues } = useForm({
    validationSchema: activitySchema,
    initialValues: INITIAL_VALUES,
  })

  const isEditMode = computed(() => editingActivity.value !== null)
  const isSra = computed(() => values.type === 'SRA')
  const isNewAgency = computed(() => values.agencyMode === 'new')
  const isForm2Visible = computed(() => values.form2Visible === true)

  // ─── Agency picker (existing NSRP Form 2) ───
  const establishmentQuery = ref('')
  const establishmentResults = ref<EstablishmentSearchResult[]>([])
  const isSearchingEstablishments = ref(false)
  const isLoadingEstablishment = ref(false)
  const selectedEstablishment = ref<EstablishmentSearchResult | null>(null)
  const agencyError = ref<string | null>(null)

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

  /** Loads the agency's NSRP Form 2 into the form so missing fields can be completed. */
  const selectEstablishment = async (result: EstablishmentSearchResult) => {
    isLoadingEstablishment.value = true
    try {
      const establishment = await establishmentService.fetchEstablishmentById(result.id)
      setValues({ ...toEstablishmentFormValues(establishment), form2Visible: true }, false)
      selectedEstablishment.value = result
      agencyError.value = null
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
    setValues({ ...blankForm2(values.type ?? 'LRA'), form2Visible: false }, false)
  }

  const setAgencyMode = (mode: 'existing' | 'new') => {
    if (values.agencyMode === mode) return
    selectedEstablishment.value = null
    agencyError.value = null
    setValues({ ...blankForm2(values.type ?? 'LRA'), agencyMode: mode, form2Visible: mode === 'new' }, false)
  }

  // A new agency registering for an SRA defaults to an overseas recruitment agency
  watch(
    () => values.type,
    (type) => {
      if (!isEditMode.value && isNewAgency.value && type === 'SRA') {
        setFieldValue('privateEmployerType', 'Overseas Recruitment Agency')
      }
    }
  )

  // Load the selected row (or blank values) each time the dialog opens.
  watch(isFormDialogOpen, (open) => {
    if (!open) return
    selectedEstablishment.value = null
    establishmentQuery.value = ''
    establishmentResults.value = []
    agencyError.value = null
    resetForm({ values: editingActivity.value ? toFormValues(editingActivity.value) : INITIAL_VALUES })
  })

  const onFormDialogOpenChange = (open: boolean) => {
    if (open || isSubmitting.value) return
    closeFormDialog()
  }

  const submitActivity = handleSubmit(async (formValues) => {
    const activity: RecruitmentActivityFormPayload['activity'] = {
      type: formValues.type,
      representatives: parseRepresentatives(formValues.representatives),
      start_date: formValues.startDate,
      end_date: formValues.endDate,
      venue: orNull(formValues.venue),
      city_municipality: orNull(formValues.venueCityMunicipality),
      remarks: orNull(formValues.remarks),
    }

    if (editingActivity.value) {
      // Type and agency are fixed once the checklist exists
      const { type: _type, ...editable } = activity
      await updateActivity(editingActivity.value.id, editable)
      return
    }

    if (formValues.agencyMode === 'existing' && !selectedEstablishment.value) {
      agencyError.value = 'Pick the agency, or register a new one.'
      return
    }

    const createdId = await createActivity({
      activity,
      establishmentId: formValues.agencyMode === 'existing' ? selectedEstablishment.value!.id : null,
      establishment: toEstablishmentFormFields(formValues),
    })
    if (createdId) {
      void router.push({ name: 'provincial-peso-recruitment-activity-details', params: { activityId: createdId } })
    }
  })

  return {
    isFormDialogOpen,
    isSubmitting,
    isEditMode,
    isSra,
    isNewAgency,
    isForm2Visible,
    editingActivity,
    onFormDialogOpenChange,
    submitActivity,
    setAgencyMode,
    establishmentQuery,
    establishmentResults,
    isSearchingEstablishments,
    isLoadingEstablishment,
    selectedEstablishment,
    selectEstablishment,
    clearSelectedEstablishment,
    agencyError,
    establishmentSearchMinLength: ESTABLISHMENT_SEARCH_MIN_LENGTH,
    typeLabels: RECRUITMENT_ACTIVITY_TYPE_LABELS,
  }
}
