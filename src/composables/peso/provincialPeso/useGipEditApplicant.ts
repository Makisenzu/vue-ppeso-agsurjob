import { computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import * as z from 'zod'
import { useGipStore } from '@/stores/peso/provincialPeso/gipStore'
import { DOCUMENT_OPTIONS } from '@/composables/peso/provincialPeso/useApplicantNewEntry'
import type { EditableGipApplicantStatus } from '@/types/peso/provincialPeso/gip'
import { normalizeStatusRemarks, refineStatusRemarks, requiresStatusRemarks } from '@/helpers/common/statusRemarksHelper'

export const GIP_EDITABLE_STATUSES = ['Pending', 'Approved', 'Rejected'] as const satisfies readonly EditableGipApplicantStatus[]

const LOCKED_DOCUMENT = 'NSRP'

const editApplicantSchema = toTypedSchema(
  z
    .object({
      status: z.enum(GIP_EDITABLE_STATUSES),
      documentsSubmitted: z
        .array(z.string().trim().min(1))
        .refine((docs) => docs.includes(LOCKED_DOCUMENT), { message: 'NSRP must be included.' }),
      remarks: z.string().trim().optional(),
    })
    // Rejecting needs remarks; the applicant reads them in their notification
    .superRefine(refineStatusRemarks)
)

// Older records use longer labels; map them onto the applicant-entry checklist names
function normalizeDocumentName(doc: string): string {
  const trimmed = doc.trim()
  const upper = trimmed.toUpperCase()
  if (upper.startsWith('NSRP')) return 'NSRP'
  if (upper.startsWith('RESUME')) return 'Resume'
  return trimmed
}

export function useGipEditApplicant() {
  const store = useGipStore()
  const {
    applicantToEdit,
    isEditApplicantDialogOpen,
    isSavingApplicantReview,
    applicantToEditDocuments,
    isLoadingApplicantDocuments,
  } = storeToRefs(store)
  const { closeEditApplicantDialog, updateApplicantReview } = store

  const { handleSubmit, resetForm, setFieldValue, values } = useForm({
    validationSchema: editApplicantSchema,
    initialValues: { status: 'Pending' as EditableGipApplicantStatus, documentsSubmitted: [LOCKED_DOCUMENT], remarks: '' },
  })

  const isRemarksRequired = computed(() => requiresStatusRemarks(values.status))

  const editDocuments = computed<string[]>(() => values.documentsSubmitted ?? [])

  const isEditingHiredApplicant = computed(() => {
    const s = (applicantToEdit.value?.status || '').trim().toLowerCase()
    return s === 'hired' || s === 'deployed'
  })

  // Checklist options plus any non-standard documents already on file, so nothing is silently dropped
  const editDocumentOptions = computed<string[]>(() => {
    const extras = editDocuments.value.filter((d) => !DOCUMENT_OPTIONS.includes(d))
    return [...DOCUMENT_OPTIONS, ...extras]
  })

  const isExtraDocument = (doc: string) => !DOCUMENT_OPTIONS.includes(doc)

  watch(
    applicantToEdit,
    (app) => {
      if (!app) return
      const current = (app.status || 'Pending').trim()
      const status = (GIP_EDITABLE_STATUSES as readonly string[]).includes(current)
        ? (current as EditableGipApplicantStatus)
        : 'Pending'

      const source: string[] =
        app.documentsSubmitted && app.documentsSubmitted.length > 0
          ? app.documentsSubmitted
          : app.rawApplicant?.documents_submitted || []
      const documents = Array.from(new Set(source.map(normalizeDocumentName).filter(Boolean)))
      if (!documents.includes(LOCKED_DOCUMENT)) documents.unshift(LOCKED_DOCUMENT)

      // status_remarks (migration 055) comes with the raw gip_applicants row
      const remarks = typeof app.rawApplication?.status_remarks === 'string' ? app.rawApplication.status_remarks : ''
      resetForm({ values: { status, documentsSubmitted: documents, remarks } })
    },
    { immediate: true }
  )

  // A document with an uploaded soft copy counts as submitted, even when the cached list predates the upload
  watch(applicantToEditDocuments, (uploaded) => {
    const names = Object.keys(uploaded).map(normalizeDocumentName)
    const missing = names.filter((name) => !editDocuments.value.includes(name))
    if (missing.length) setFieldValue('documentsSubmitted', [...editDocuments.value, ...missing])
  })

  const toggleEditDocument = (doc: string) => {
    if (doc === LOCKED_DOCUMENT) return
    const current = editDocuments.value
    setFieldValue(
      'documentsSubmitted',
      current.includes(doc) ? current.filter((d) => d !== doc) : [...current, doc]
    )
  }

  const onEditDialogOpenChange = (open: boolean) => {
    if (!open && !isSavingApplicantReview.value) closeEditApplicantDialog()
  }

  const saveApplicantReview = handleSubmit(async (formValues) => {
    const app = applicantToEdit.value
    if (!app) return
    // Keep checklist order stable in the saved record
    const ordered = editDocumentOptions.value.filter((d) => formValues.documentsSubmitted.includes(d))
    await updateApplicantReview({
      applicationId: app.id,
      applicantId: app.applicantId,
      status: formValues.status,
      documentsSubmitted: ordered,
      remarks: normalizeStatusRemarks(formValues.remarks),
    })
  })

  return {
    applicantToEdit,
    isEditApplicantDialogOpen,
    isSavingApplicantReview,
    isEditingHiredApplicant,
    isRemarksRequired,
    uploadedDocuments: applicantToEditDocuments,
    isLoadingUploadedDocuments: isLoadingApplicantDocuments,
    editStatusOptions: GIP_EDITABLE_STATUSES,
    editDocuments,
    editDocumentOptions,
    lockedDocument: LOCKED_DOCUMENT,
    isExtraDocument,
    toggleEditDocument,
    onEditDialogOpenChange,
    closeEditApplicantDialog,
    saveApplicantReview,
  }
}
