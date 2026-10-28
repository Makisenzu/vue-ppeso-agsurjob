import { computed, onScopeDispose, reactive, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute } from 'vue-router'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import * as z from 'zod'
import { useAuthStore } from '@/stores/common/auth'
import { useTupadApplicationStore } from '@/stores/applicant/tupadApplicationStore'
import { useSignedDocumentUrls } from '@/composables/common/usePrivateDocuments'
import { describeGipApplicant, formatGipDate } from '@/helpers/applicant/gipApplicationHelper'
import { parseTupadIncome, tupadIncomeSchema, validateTupadAttachment } from '@/helpers/common/tupadFormHelper'
import { formatTupadIncome } from '@/helpers/peso/provincialPeso/tupadHelper'
import {
  listReusableProfileDocuments,
  normalizeRequirementLabel,
} from '@/helpers/applicant/applicantRequirementDocuments'
import {
  TUPAD_ATTACHMENT_ACCEPT,
  TUPAD_ATTACHMENT_MAX_BYTES,
  TUPAD_DOCUMENT_OPTIONS,
  type TupadPendingDocumentMap,
} from '@/types/common/tupad'
import {
  TUPAD_NSRP_DOCUMENT,
  TUPAD_PROFILE_DOCUMENT_MATCHES,
  TUPAD_PROFILING_FORM_DOCUMENT,
  TUPAD_REQUIREMENTS,
  type TupadReusedDocumentMap,
} from '@/types/common/tupadProgram'
import type { GipProgressStep, GipRequirementRow } from '@/composables/applicant/useGipApplicationForm'

export const TUPAD_STATUS_DESCRIPTIONS: Record<string, string> = {
  Pending: 'PESO is reviewing your requirements. You can still change them until then.',
  Approved: 'You are approved for TUPAD. PESO will add you to a batch.',
  Rejected: 'Your application was not approved this time.',
}

const formatDate = (value?: string | null) =>
  value ? new Date(`${value}T00:00:00`).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'

/** "TUPAD-APP-2026-1A2B", same shape as the GIP reference (and Application Status) */
const tupadApplicationCode = (id: string, createdAt: string | null | undefined) => {
  const year = (createdAt ? new Date(createdAt).getFullYear() : NaN) || new Date().getFullYear()
  return `TUPAD-APP-${year}-${id.slice(0, 4).toUpperCase()}`
}

/** Steps of applying; once applied, the page shows the progress tracker instead */
export const TUPAD_WIZARD_STEPS = [
  { key: 'details', title: 'Your details', description: 'Check your NSRP details and add your household income.' },
  { key: 'requirements', title: 'Requirements', description: 'Attach a photo or PDF of each requirement.' },
  { key: 'review', title: 'Review & submit', description: 'Check your details and files, then submit.' },
] as const

const detailsSchema = toTypedSchema(
  z.object({
    // Accepts the number v-model gives for <input type="number">; required to join a batch (022)
    monthly_income: tupadIncomeSchema.refine((value) => value !== '', { message: 'Enter your monthly income.' }),
    dependent_name: z.string().trim().optional(),
  })
)

/**
 * Applicant's TUPAD application form (BACKEND.md §18, like useGipApplicationForm): they apply with their
 * household income and the requirements (NSRP is generated from their profile), then follow their
 * status and batches here.
 */
export function useTupadApplicationForm() {
  const authStore = useAuthStore()
  const { user, applicantProfile } = storeToRefs(authStore)
  const store = useTupadApplicationStore()
  const {
    myApplication,
    documents,
    engagements,
    isLoading,
    errorMessage,
    isSubmitting,
    isLocked,
    isGeneratingNsrp,
    isGeneratingTupadForm,
    deletingDocument,
  } = storeToRefs(store)

  const applicantId = computed(() => applicantProfile.value?.id ?? null)

  // ─── Household details ───
  const { values, meta, validate, resetForm } = useForm({
    validationSchema: detailsSchema,
    initialValues: { monthly_income: '' as number | string, dependent_name: '' },
    // The fields are hidden on some steps and once the application is locked
    keepValuesOnUnmount: true,
  })

  const loadDetails = () => {
    resetForm({
      values: {
        monthly_income: myApplication.value?.monthly_income ?? '',
        dependent_name: myApplication.value?.dependent_name ?? '',
      },
    })
  }

  // ─── Picked files ───
  /** Files picked in this visit, uploaded on submit */
  const pendingFiles = ref<TupadPendingDocumentMap>({})
  const fileErrors = reactive<Record<string, string>>({})
  // Object URLs for viewing picked files; revoked when the file is cleared or the page closes
  const previewUrls = reactive<Record<string, string>>({})

  const revokePreview = (doc: string) => {
    if (previewUrls[doc]) URL.revokeObjectURL(previewUrls[doc])
    delete previewUrls[doc]
  }

  const setPendingFile = (doc: string, file: File) => {
    revokePreview(doc)
    previewUrls[doc] = URL.createObjectURL(file)
    pendingFiles.value = { ...pendingFiles.value, [doc]: file }
  }

  const selectFile = (doc: string, file: File | null | undefined) => {
    delete fileErrors[doc]
    if (!file) return
    const error = validateTupadAttachment(file)
    if (error) {
      fileErrors[doc] = error
      return
    }
    const { [doc]: _reused, ...otherReused } = reusedDocs.value
    reusedDocs.value = otherReused
    if (doc === TUPAD_PROFILING_FORM_DOCUMENT) generatedTupadFormFor.value = null
    setPendingFile(doc, file)
  }

  const clearPendingFile = (doc: string) => {
    const { [doc]: _removed, ...rest } = pendingFiles.value
    pendingFiles.value = rest
    const { [doc]: _reused, ...otherReused } = reusedDocs.value
    reusedDocs.value = otherReused
    revokePreview(doc)
    delete fileErrors[doc]
    if (doc === TUPAD_PROFILING_FORM_DOCUMENT) generatedTupadFormFor.value = null
  }

  const resetPicks = () => {
    pendingFiles.value = {}
    reusedDocs.value = {}
    dismissedProfileMatches.clear()
    generatedTupadFormFor.value = null
    for (const key of Object.keys(previewUrls)) revokePreview(key)
    for (const key of Object.keys(fileErrors)) delete fileErrors[key]
  }

  // ─── Documents already on the profile ───
  /** Profile documents chosen for a requirement, copied into the application on submit */
  const reusedDocs = ref<TupadReusedDocumentMap>({})
  /** Requirements whose auto-attached profile document was removed, so it isn't attached again */
  const dismissedProfileMatches = reactive(new Set<string>())

  /** Files the applicant already uploaded on their profile; TUPAD takes images as well as PDFs */
  const profileDocuments = computed(() =>
    listReusableProfileDocuments(authStore.applicantRequirementMedia ?? [], authStore.applicantRequirements ?? [])
  )

  /** Signed preview links of the attached profile documents (the documents bucket is private) */
  const reusedUrls = useSignedDocumentUrls(() =>
    Object.values(reusedDocs.value).flatMap((document) => (document ? [document.path] : []))
  )
  const reusedUrlFor = (doc: string) => {
    const path = reusedDocs.value[doc]?.path
    return path ? (reusedUrls[path] ?? null) : null
  }

  const attachProfileDocument = (doc: string, profileDocumentId: string) => {
    const document = profileDocuments.value.find((item) => item.id === profileDocumentId)
    if (!document) return
    clearPendingFile(doc)
    reusedDocs.value = { ...reusedDocs.value, [doc]: document }
  }

  /** Attaches the profile document of the same kind to each requirement that has nothing yet */
  const attachProfileMatches = () => {
    for (const [doc, labels] of Object.entries(TUPAD_PROFILE_DOCUMENT_MATCHES)) {
      if (dismissedProfileMatches.has(doc) || documents.value[doc] || pendingFiles.value[doc] || reusedDocs.value[doc]) {
        continue
      }
      const wanted = (labels ?? []).map(normalizeRequirementLabel)
      const match = profileDocuments.value.find((item) => wanted.includes(normalizeRequirementLabel(item.label)))
      if (match) reusedDocs.value = { ...reusedDocs.value, [doc]: match }
    }
  }

  onScopeDispose(resetPicks)

  // ─── NSRP Form ───
  /** Set once the applicant removes the generated form, so it isn't silently attached again */
  const isNsrpDismissed = ref(false)

  const generateNsrp = async () => {
    const profileId = user.value?.id
    if (!profileId) return
    delete fileErrors[TUPAD_NSRP_DOCUMENT]
    const file = await store.generateNsrpPdf(profileId)
    if (file) {
      isNsrpDismissed.value = false
      setPendingFile(TUPAD_NSRP_DOCUMENT, file)
    }
  }

  // ─── TUPAD Profiling Form ───
  /** Set once the applicant removes the generated form, so it isn't silently attached again */
  const isTupadFormDismissed = ref(false)
  /** Household details the picked TUPAD form was generated from; null when it was uploaded by hand */
  const generatedTupadFormFor = ref<string | null>(null)

  const profilingDetails = () => ({
    monthlyIncome: parseTupadIncome(values.monthly_income),
    dependentName: values.dependent_name?.trim() || null,
  })

  const generateTupadForm = async () => {
    const profileId = user.value?.id
    if (!profileId) return
    delete fileErrors[TUPAD_PROFILING_FORM_DOCUMENT]
    const details = profilingDetails()
    const file = await store.generateTupadFormPdf(profileId, details)
    if (file) {
      isTupadFormDismissed.value = false
      clearPendingFile(TUPAD_PROFILING_FORM_DOCUMENT)
      setPendingFile(TUPAD_PROFILING_FORM_DOCUMENT, file)
      generatedTupadFormFor.value = JSON.stringify(details)
    }
  }

  /**
   * Generates the TUPAD form when nothing is attached yet, or again when the picked one was generated
   * from household details that have changed since. A saved or hand-picked file is left alone.
   */
  const refreshTupadForm = async () => {
    const doc = TUPAD_PROFILING_FORM_DOCUMENT
    const isStale =
      generatedTupadFormFor.value !== null && generatedTupadFormFor.value !== JSON.stringify(profilingDetails())
    const isMissing = !documents.value[doc] && !pendingFiles.value[doc] && !reusedDocs.value[doc]
    if (isStale || (isMissing && !isTupadFormDismissed.value)) await generateTupadForm()
  }

  /** "Generate" from the requirement list (the NSRP has its own event) */
  const generateDocument = async (doc: string) => {
    if (doc === TUPAD_PROFILING_FORM_DOCUMENT) await generateTupadForm()
  }

  /** Removes a picked file, or the saved one when there's nothing picked */
  const removeFile = async (doc: string) => {
    if (doc === TUPAD_NSRP_DOCUMENT) isNsrpDismissed.value = true
    if (doc === TUPAD_PROFILING_FORM_DOCUMENT) isTupadFormDismissed.value = true
    if (reusedDocs.value[doc]) dismissedProfileMatches.add(doc)
    if (pendingFiles.value[doc] || reusedDocs.value[doc]) {
      clearPendingFile(doc)
      return
    }
    if (applicantId.value) await store.deleteDocument(applicantId.value, doc)
  }

  // ─── Requirements ───
  const received = computed(() => new Set(myApplication.value?.doc_submitted ?? []))

  const requirements = computed<GipRequirementRow[]>(() =>
    TUPAD_REQUIREMENTS.map(({ name, hint }) => {
      const saved = documents.value[name]
      return {
        name,
        hint,
        isNsrp: name === TUPAD_NSRP_DOCUMENT,
        generateLabel: name === TUPAD_PROFILING_FORM_DOCUMENT ? 'Generate TUPAD form' : null,
        isGenerating: name === TUPAD_PROFILING_FORM_DOCUMENT && isGeneratingTupadForm.value,
        isOptional: false,
        isReceived: received.value.has(name),
        savedFileName: saved?.file_name ?? null,
        savedFileUrl: saved?.url ?? null,
        uploadedAt: saved ? formatGipDate(saved.updated_at) : null,
        pendingFileName: pendingFiles.value[name]?.name ?? reusedDocs.value[name]?.fileName ?? null,
        pendingFileUrl: previewUrls[name] ?? reusedUrlFor(name),
        isFromProfile: !pendingFiles.value[name] && !!reusedDocs.value[name],
        isDeleting: deletingDocument.value === name,
        error: fileErrors[name] ?? null,
      }
    })
  )

  const canUpload = computed(() => !!applicantId.value && !isLocked.value && !isLoading.value)
  const hasPendingFiles = computed(
    () => Object.keys(pendingFiles.value).length > 0 || Object.keys(reusedDocs.value).length > 0
  )
  /** Something to save on the tracker: a picked file or changed household details */
  const hasChanges = computed(() => hasPendingFiles.value || meta.value.dirty)

  /** Every requirement needs a file — the saved one or a newly picked one. */
  const validateFiles = (): boolean => {
    let valid = true
    for (const doc of TUPAD_DOCUMENT_OPTIONS) {
      if (!pendingFiles.value[doc] && !reusedDocs.value[doc] && !documents.value[doc]) {
        fileErrors[doc] =
          doc === TUPAD_NSRP_DOCUMENT
            ? 'Generate your NSRP form to attach it.'
            : doc === TUPAD_PROFILING_FORM_DOCUMENT
              ? 'Generate your TUPAD form, or attach a copy of it.'
              : 'Attach a photo or PDF of this document.'
        valid = false
      }
    }
    return valid
  }

  const submit = async () => {
    const uploaderId = user.value?.id
    if (!uploaderId || !applicantId.value) return
    if (!(await validate()).valid) return
    // A generated TUPAD form shows the income and dependents being submitted
    await refreshTupadForm()
    if (!validateFiles()) return
    if (myApplication.value && !hasChanges.value) return
    const saved = await store.submitApplication({
      applicantId: applicantId.value,
      uploaderId,
      details: {
        monthly_income: parseTupadIncome(values.monthly_income),
        dependent_name: values.dependent_name?.trim() || null,
      },
      pending: pendingFiles.value,
      reused: reusedDocs.value,
    })
    if (saved) {
      resetPicks()
      loadDetails()
    }
  }

  // ─── Status ───
  const hasApplied = computed(() => !!myApplication.value)
  const status = computed(() => myApplication.value?.status ?? 'Pending')
  const isDeployed = computed(() => engagements.value.length > 0)
  const statusDescription = computed(() =>
    isDeployed.value ? 'You are a TUPAD beneficiary. Your batches are listed below.' : (TUPAD_STATUS_DESCRIPTIONS[status.value] ?? '')
  )
  const statusRemarks = computed(() => (status.value === 'Rejected' ? (myApplication.value?.status_remarks ?? null) : null))

  /** When an approved applicant comes to the office for orientation, with PESO's note (migration 070); gone once in a batch */
  const orientation = computed(() => {
    const at = status.value === 'Approved' && !isDeployed.value ? myApplication.value?.orientation_at : null
    const date = at ? new Date(at) : null
    if (!date || Number.isNaN(date.getTime())) return null
    return {
      date: date.toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
      time: date.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' }),
      note: myApplication.value?.orientation_note?.trim() || null,
    }
  })
  const appliedOn = computed(() => formatDate(myApplication.value?.created_at?.slice(0, 10)))

  /** Details of the application, label → value */
  const applicationDetails = computed(() => {
    const application = myApplication.value
    if (!application) return []
    const submitted = requirements.value.filter((doc) => doc.isReceived).length
    return [
      { label: 'Reference no.', value: tupadApplicationCode(application.id, application.created_at) },
      { label: 'Program', value: 'TUPAD' },
      { label: 'Date applied', value: formatGipDate(application.created_at) },
      { label: 'Last updated', value: formatGipDate(application.updated_at ?? application.created_at) },
      { label: 'Applied through', value: application.applied_online ? 'Online, through AGSURJOBS' : 'Referred by PESO' },
      { label: 'Requirements', value: `${submitted} of ${requirements.value.length} submitted` },
    ]
  })

  /** Household details as entered, for the review step and the read-only tracker */
  const householdDetails = computed(() => [
    { label: 'Monthly income', value: formatTupadIncome(parseTupadIncome(values.monthly_income)) },
    { label: 'Dependents', value: values.dependent_name?.trim() || '—' },
  ])

  /** The applicant's own details PESO reviews, from their NSRP record */
  const applicantDetails = computed(() => (applicantProfile.value ? describeGipApplicant(applicantProfile.value) : []))

  const batches = computed(() =>
    engagements.value.map((engagement) => ({
      id: engagement.id,
      edlNumber: engagement.batch?.edl_number ?? '—',
      period: `${formatDate(engagement.batch?.start_date)} – ${formatDate(engagement.batch?.end_date)}`,
      days: engagement.days_duration,
      status: engagement.status,
    }))
  )

  // ─── Application wizard (before applying) ───
  const currentStep = ref(0)
  /** Furthest step opened so far; the stepper only jumps back to steps already reached */
  const reachedStep = ref(0)
  const currentStepMeta = computed(() => TUPAD_WIZARD_STEPS[currentStep.value]!)
  const isLastStep = computed(() => currentStep.value === TUPAD_WIZARD_STEPS.length - 1)

  const goToStep = (index: number) => {
    if (index < 0 || index > reachedStep.value) return
    currentStep.value = index
  }

  /** Moves on; leaving Your details needs the income, leaving Requirements needs every file */
  const nextStep = async () => {
    if (currentStepMeta.value.key === 'details' && !(await validate()).valid) return
    if (currentStepMeta.value.key === 'requirements' && !validateFiles()) return
    if (isLastStep.value) return
    currentStep.value += 1
    reachedStep.value = Math.max(reachedStep.value, currentStep.value)
    // The TUPAD form is filled in from the details just entered
    if (currentStepMeta.value.key === 'requirements') void refreshTupadForm()
  }

  const previousStep = () => goToStep(currentStep.value - 1)

  const attachedRequirements = computed(() =>
    requirements.value.filter((doc) => doc.pendingFileName || doc.savedFileName)
  )

  // ─── Progress tracker (after applying) ───
  const progressSteps = computed<GipProgressStep[]>(() => {
    const isRejected = status.value === 'Rejected'
    const isApproved = status.value === 'Approved' || isDeployed.value
    // Index of the step in progress; every step before it is done
    const current = isDeployed.value ? 4 : isApproved ? 3 : isRejected ? 2 : 1
    const states = (index: number): GipProgressStep['state'] => {
      if (isRejected && index === 2) return 'rejected'
      if (index < current) return 'completed'
      return index === current ? 'active' : 'upcoming'
    }
    return [
      { title: 'Submitted', state: states(0) },
      { title: 'Under review', state: states(1) },
      { title: isRejected ? 'Not approved' : 'Approved', state: states(2) },
      { title: 'In a batch', state: states(3) },
    ]
  })

  const reload = async () => {
    if (!applicantId.value) return
    resetPicks()
    isTupadFormDismissed.value = false
    currentStep.value = 0
    reachedStep.value = 0
    await store.fetchMyApplication(applicantId.value)
    loadDetails()
  }

  // The auth store may still be hydrating when the page opens
  watch(applicantId, () => void reload(), { immediate: true })

  // The NSRP form is generated and attached as soon as the form can take it
  watch(
    canUpload,
    (can) => {
      if (!can || isNsrpDismissed.value || isGeneratingNsrp.value) return
      if (documents.value[TUPAD_NSRP_DOCUMENT] || pendingFiles.value[TUPAD_NSRP_DOCUMENT]) return
      void generateNsrp()
    },
    { immediate: true }
  )

  // Matching profile documents are attached as soon as the form can take them
  watch(
    [canUpload, profileDocuments],
    ([can]) => {
      if (can) attachProfileMatches()
    },
    { immediate: true }
  )

  // Opened from Application Status (?from=application): go back there, otherwise to the TUPAD page
  const route = useRoute()
  const backLink = computed(() =>
    route.query.from === 'application'
      ? { to: { name: 'application' }, label: 'Application Status' }
      : { to: { name: 'tupad-application' }, label: 'TUPAD' }
  )

  return {
    backLink,
    requirements,
    attachmentAccept: TUPAD_ATTACHMENT_ACCEPT,
    attachmentMaxMb: TUPAD_ATTACHMENT_MAX_BYTES / 1024 / 1024,
    isLoading,
    errorMessage,
    isLocked,
    canUpload,
    hasChanges,
    isSubmitting,
    hasApplied,
    status,
    statusDescription,
    statusRemarks,
    orientation,
    appliedOn,
    batches,
    applicationDetails,
    householdDetails,
    applicantDetails,
    isGeneratingNsrp,
    isGeneratingTupadForm,
    wizardSteps: TUPAD_WIZARD_STEPS,
    currentStep,
    reachedStep,
    currentStepMeta,
    isLastStep,
    attachedRequirements,
    progressSteps,
    goToStep,
    nextStep,
    previousStep,
    profileDocuments,
    selectFile,
    attachProfileDocument,
    removeFile,
    generateNsrp,
    generateDocument,
    submit,
    reload,
  }
}
