import { computed, reactive, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import * as z from 'zod'
import { useAuthStore } from '@/stores/common/auth'
import { useTupadApplicationStore } from '@/stores/applicant/tupadApplicationStore'
import {
  parseTupadIncome,
  toggleTupadDocument,
  tupadDocumentsSchema,
  tupadIncomeSchema,
  validateTupadAttachment,
  withLockedTupadDocument,
} from '@/helpers/common/tupadFormHelper'
import {
  TUPAD_ATTACHMENT_ACCEPT,
  TUPAD_DOCUMENT_OPTIONS,
  TUPAD_LOCKED_DOCUMENT,
  type TupadPendingDocumentMap,
} from '@/types/common/tupad'
import type { TupadApplicationRow } from '@/types/applicant/tupadApplication'

const applicationSchema = toTypedSchema(
  z.object({
    monthly_income: tupadIncomeSchema,
    dependent_name: z.string().trim().optional(),
    doc_submitted: tupadDocumentsSchema,
  })
)

const INITIAL_VALUES = {
  monthly_income: '' as number | string,
  dependent_name: '',
  doc_submitted: [TUPAD_LOCKED_DOCUMENT] as string[],
}

function toFormValues(row: TupadApplicationRow): typeof INITIAL_VALUES {
  return {
    monthly_income: row.monthly_income ?? '',
    dependent_name: row.dependent_name ?? '',
    doc_submitted: withLockedTupadDocument(row.doc_submitted),
  }
}

/**
 * Applicant's TUPAD application — like SPES, every ticked document must have an image / PDF attached.
 * Only applicants PESO referred to TUPAD (Entry of Applicants) have an application to fill in.
 */
export function useTupadApplication() {
  const authStore = useAuthStore()
  const { user, applicantProfile } = storeToRefs(authStore)
  const store = useTupadApplicationStore()
  const { myApplication, documents, engagements, isLoading, isSubmitting, errorMessage, isLocked } = storeToRefs(store)
  const { fetchMyApplication, saveApplication } = store

  const { handleSubmit, resetForm, values } = useForm({
    validationSchema: applicationSchema,
    initialValues: INITIAL_VALUES,
  })

  const applicantId = computed(() => applicantProfile.value?.id ?? null)
  const hasRegistryRecord = computed(() => applicantId.value !== null)

  // ─── Attachments ───
  /** Files picked in this session, uploaded when the application is saved. */
  const pendingFiles = ref<TupadPendingDocumentMap>({})
  const fileErrors = reactive<Record<string, string>>({})

  const hasFile = (doc: string) => !!pendingFiles.value[doc] || !!documents.value[doc]

  const selectFile = (doc: string, file: File | null | undefined) => {
    delete fileErrors[doc]
    if (!file) return
    const error = validateTupadAttachment(file)
    if (error) {
      fileErrors[doc] = error
      return
    }
    pendingFiles.value = { ...pendingFiles.value, [doc]: file }
  }

  const clearPendingFile = (doc: string) => {
    const { [doc]: _removed, ...rest } = pendingFiles.value
    pendingFiles.value = rest
    delete fileErrors[doc]
  }

  /** Every ticked document needs a file — the saved one or a newly picked one. */
  const validateFiles = (checked: readonly string[]): boolean => {
    let valid = true
    for (const doc of TUPAD_DOCUMENT_OPTIONS) {
      if (fileErrors[doc] && hasFile(doc)) delete fileErrors[doc]
      if (checked.includes(doc) && !hasFile(doc)) {
        fileErrors[doc] = 'Attach an image or PDF of this document.'
        valid = false
      }
    }
    return valid
  }

  const toggleDocument = (current: string[] | undefined, doc: string, checked: boolean | 'indeterminate') => {
    if (checked !== true) delete fileErrors[doc]
    return toggleTupadDocument(current, doc, checked)
  }

  // ─── Load ───
  const loadIntoForm = () => {
    pendingFiles.value = {}
    for (const key of Object.keys(fileErrors)) delete fileErrors[key]
    resetForm({ values: myApplication.value ? toFormValues(myApplication.value) : INITIAL_VALUES })
  }

  const reload = async () => {
    if (!applicantId.value) return
    await fetchMyApplication(applicantId.value)
    loadIntoForm()
  }

  // The auth store may still be hydrating when the page opens
  watch(applicantId, () => void reload(), { immediate: true })

  // ─── Submit ───
  const submitApplication = handleSubmit(async (formValues) => {
    const uploaderId = user.value?.id
    if (!uploaderId || !validateFiles(formValues.doc_submitted)) return

    const saved = await saveApplication(
      uploaderId,
      {
        monthly_income: parseTupadIncome(formValues.monthly_income),
        dependent_name: formValues.dependent_name || null,
        doc_submitted: formValues.doc_submitted,
      },
      pendingFiles.value
    )
    if (saved) loadIntoForm()
  })

  const missingForBatch = computed(() => {
    const missing: string[] = []
    if (parseTupadIncome(values.monthly_income) === null) missing.push('Monthly income')
    for (const doc of TUPAD_DOCUMENT_OPTIONS) {
      if (!(values.doc_submitted ?? []).includes(doc)) missing.push(doc)
    }
    return missing
  })

  return {
    myApplication,
    documents,
    engagements,
    isLoading,
    isSubmitting,
    errorMessage,
    isLocked,
    hasRegistryRecord,
    documentOptions: TUPAD_DOCUMENT_OPTIONS,
    lockedDocument: TUPAD_LOCKED_DOCUMENT,
    attachmentAccept: TUPAD_ATTACHMENT_ACCEPT,
    pendingFiles,
    fileErrors,
    missingForBatch,
    selectFile,
    clearPendingFile,
    toggleDocument,
    reload,
    submitApplication,
  }
}
