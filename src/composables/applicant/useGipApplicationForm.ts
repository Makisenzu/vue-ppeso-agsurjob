import { computed, onScopeDispose, reactive, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/common/auth'
import { useGipApplicationStore } from '@/stores/applicant/gipApplicationStore'
import {
  formatGipDateTime,
  gipApplicationCode,
  gipApplicationSource,
  describeGipApplicant,
  normalizeGipDocumentName,
  normalizeGipStatus,
  validateGipAttachment,
} from '@/helpers/applicant/gipApplicationHelper'
import {
  GIP_ATTACHMENT_ACCEPT,
  GIP_ATTACHMENT_MAX_BYTES,
  GIP_NSRP_DOCUMENT,
  GIP_OPTIONAL_DOCUMENTS,
  GIP_REQUIRED_DOCUMENTS,
  GIP_PROFILE_DOCUMENT_MATCHES,
  GIP_UPLOAD_DOCUMENTS,
  type GipPendingDocumentMap,
  type GipReusedDocumentMap,
} from '@/types/common/gipProgram'
import {
  listReusableProfileDocuments,
  normalizeRequirementLabel,
} from '@/helpers/applicant/applicantRequirementDocuments'

export const GIP_STATUS_DESCRIPTIONS: Record<string, string> = {
  Pending: 'PESO is reviewing your requirements. You can still replace a file until then.',
  Approved: 'You are approved for GIP. PESO will contact you about your appointment.',
  Rejected: 'Your application was not approved this time.',
  Hired: 'You are a GIP intern. Your appointments are listed below.',
}

const formatDate = (value?: string | null) =>
  value ? new Date(`${value}T00:00:00`).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'

/** Steps of applying; once applied, the page shows the progress tracker instead */
export const GIP_WIZARD_STEPS = [
  { key: 'details', title: 'Your details', description: 'Check the details PESO will review, from your NSRP profile.' },
  { key: 'requirements', title: 'Requirements', description: 'Attach a PDF of each requirement.' },
  { key: 'review', title: 'Review & submit', description: 'Check your files, then submit your application.' },
] as const

/** A step of the application's progress tracker */
export interface GipProgressStep {
  title: string
  state: 'completed' | 'active' | 'upcoming' | 'rejected'
}

/** One requirement of the application form */
export interface GipRequirementRow {
  name: string
  /** NSRP Form 1: generated from the registry record and attached, not picked from files */
  isNsrp: boolean
  isOptional: boolean
  /** Ticked in PESO's checklist (uploaded here, or handed in on paper) */
  isReceived: boolean
  savedFileName: string | null
  savedFileUrl: string | null
  /** When the saved file was uploaded */
  uploadedAt: string | null
  pendingFileName: string | null
  /** Object URL of the picked / generated file, to view it before submitting */
  pendingFileUrl: string | null
  /** The attached file is a document from the applicant's profile, copied on submit */
  isFromProfile: boolean
  isDeleting: boolean
  error: string | null
}

/**
 * Applicant's GIP application form: they apply by uploading soft copies of the requirements
 * (NSRP is already their profile), then follow their status and appointments here.
 */
export function useGipApplicationForm() {
  const authStore = useAuthStore()
  const { user, applicantProfile } = storeToRefs(authStore)
  const store = useGipApplicationStore()
  const {
    myApplication,
    documents,
    internships,
    isLoading,
    errorMessage,
    isSubmitting,
    isLocked,
    isGeneratingNsrp,
    deletingDocument,
  } = storeToRefs(store)

  const applicantId = computed(() => applicantProfile.value?.id ?? null)

  // ─── Picked files ───
  /** Files picked in this visit, uploaded on submit */
  const pendingFiles = ref<GipPendingDocumentMap>({})
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
    const error = validateGipAttachment(file)
    if (error) {
      fileErrors[doc] = error
      return
    }
    const { [doc]: _reused, ...otherReused } = reusedDocs.value
    reusedDocs.value = otherReused
    setPendingFile(doc, file)
  }

  const clearPendingFile = (doc: string) => {
    const { [doc]: _removed, ...rest } = pendingFiles.value
    pendingFiles.value = rest
    const { [doc]: _reused, ...otherReused } = reusedDocs.value
    reusedDocs.value = otherReused
    revokePreview(doc)
    delete fileErrors[doc]
  }

  const resetPicks = () => {
    pendingFiles.value = {}
    reusedDocs.value = {}
    dismissedProfileMatches.clear()
    for (const key of Object.keys(previewUrls)) revokePreview(key)
    for (const key of Object.keys(fileErrors)) delete fileErrors[key]
  }

  // ─── Documents already on the profile ───
  /** Profile documents chosen for a requirement, copied into the application on submit */
  const reusedDocs = ref<GipReusedDocumentMap>({})
  /** Requirements whose auto-attached profile document was removed, so it isn't attached again */
  const dismissedProfileMatches = reactive(new Set<string>())

  /** PDFs the applicant already uploaded on their profile (application form, resume, birth certificate, ...) */
  const profileDocuments = computed(() =>
    listReusableProfileDocuments(authStore.applicantRequirementMedia ?? [], authStore.applicantRequirements ?? [], {
      pdfOnly: true,
    })
  )

  const attachProfileDocument = (doc: string, profileDocumentId: string) => {
    const document = profileDocuments.value.find((item) => item.id === profileDocumentId)
    if (!document) return
    clearPendingFile(doc)
    reusedDocs.value = { ...reusedDocs.value, [doc]: document }
  }

  /** Attaches the profile document of the same kind to each requirement that has nothing yet */
  const attachProfileMatches = () => {
    for (const [doc, labels] of Object.entries(GIP_PROFILE_DOCUMENT_MATCHES)) {
      if (dismissedProfileMatches.has(doc) || documents.value[doc] || pendingFiles.value[doc] || reusedDocs.value[doc]) {
        continue
      }
      const wanted = (labels ?? []).map(normalizeRequirementLabel)
      const match = profileDocuments.value.find((item) => wanted.includes(normalizeRequirementLabel(item.label)))
      if (match) reusedDocs.value = { ...reusedDocs.value, [doc]: match }
    }
  }

  onScopeDispose(resetPicks)

  // ─── NSRP Form 1 ───
  /** Set once the applicant removes the generated form, so it isn't silently attached again */
  const isNsrpDismissed = ref(false)

  const generateNsrp = async () => {
    const profileId = user.value?.id
    if (!profileId) return
    delete fileErrors[GIP_NSRP_DOCUMENT]
    const file = await store.generateNsrpPdf(profileId)
    if (file) {
      isNsrpDismissed.value = false
      setPendingFile(GIP_NSRP_DOCUMENT, file)
    }
  }

  /** Removes a picked file, or the saved one when there's nothing picked */
  const removeFile = async (doc: string) => {
    if (doc === GIP_NSRP_DOCUMENT) isNsrpDismissed.value = true
    if (reusedDocs.value[doc]) dismissedProfileMatches.add(doc)
    if (pendingFiles.value[doc] || reusedDocs.value[doc]) {
      clearPendingFile(doc)
      return
    }
    await store.deleteDocument(doc)
  }

  // ─── Requirements ───
  const received = computed(() => new Set((myApplication.value?.document_submitted ?? []).map(normalizeGipDocumentName)))

  const requirements = computed<GipRequirementRow[]>(() =>
    GIP_REQUIRED_DOCUMENTS.map((name) => {
      const saved = documents.value[name]
      return {
        name,
        isNsrp: name === GIP_NSRP_DOCUMENT,
        isOptional: GIP_OPTIONAL_DOCUMENTS.includes(name),
        isReceived: name === GIP_NSRP_DOCUMENT ? true : received.value.has(name),
        savedFileName: saved?.file_name ?? null,
        savedFileUrl: saved?.url ?? null,
        uploadedAt: saved ? formatGipDateTime(saved.updated_at) : null,
        pendingFileName: pendingFiles.value[name]?.name ?? reusedDocs.value[name]?.fileName ?? null,
        pendingFileUrl: previewUrls[name] ?? reusedDocs.value[name]?.url ?? null,
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

  /** Every required soft copy needs a file — the saved one or a newly picked one. */
  const validateFiles = (): boolean => {
    let valid = true
    for (const doc of GIP_UPLOAD_DOCUMENTS) {
      if (GIP_OPTIONAL_DOCUMENTS.includes(doc)) continue
      if (!pendingFiles.value[doc] && !reusedDocs.value[doc] && !documents.value[doc]) {
        fileErrors[doc] =
          doc === GIP_NSRP_DOCUMENT ? 'Generate your NSRP form to attach it.' : 'Upload a PDF copy of this document.'
        valid = false
      }
    }
    return valid
  }

  const submit = async () => {
    const uploaderId = user.value?.id
    if (!uploaderId || !validateFiles()) return
    if (myApplication.value && !hasPendingFiles.value) return
    if (await store.submitDocuments(uploaderId, pendingFiles.value, reusedDocs.value)) resetPicks()
  }

  // ─── Status ───
  const hasApplied = computed(() => !!myApplication.value)
  const status = computed(() => normalizeGipStatus(myApplication.value?.status))
  const statusDescription = computed(() => GIP_STATUS_DESCRIPTIONS[status.value] ?? '')
  const statusRemarks = computed(() => (status.value === 'Rejected' ? (myApplication.value?.status_remarks ?? null) : null))
  const appliedOn = computed(() => formatDate(myApplication.value?.created_at?.slice(0, 10)))

  /** Details of the application, label → value; empty values are left out */
  const applicationDetails = computed(() => {
    const application = myApplication.value
    if (!application) return []
    const submitted = requirements.value.filter((doc) => doc.isReceived).length
    return [
      { label: 'Reference no.', value: gipApplicationCode(application.id, application.created_at) },
      { label: 'Program', value: 'Government Internship Program (GIP)' },
      { label: 'Date applied', value: formatGipDateTime(application.created_at) },
      { label: 'Last updated', value: formatGipDateTime(application.updated_at ?? application.created_at) },
      { label: 'Applied through', value: gipApplicationSource(application.remarks) },
      { label: 'Requirements', value: `${submitted} of ${requirements.value.length} submitted` },
    ]
  })

  /** The applicant's own details PESO reviews, from their NSRP record */
  const applicantDetails = computed(() => (applicantProfile.value ? describeGipApplicant(applicantProfile.value) : []))

  const appointments = computed(() =>
    internships.value.flatMap((internship) =>
      internship.appointments.map((appointment) => ({
        ...appointment,
        period: `${formatDate(appointment.start_date)} – ${formatDate(appointment.end_date)}`,
      }))
    )
  )

  // ─── Application wizard (before applying) ───
  const currentStep = ref(0)
  /** Furthest step opened so far; the stepper only jumps back to steps already reached */
  const reachedStep = ref(0)
  const currentStepMeta = computed(() => GIP_WIZARD_STEPS[currentStep.value]!)
  const isLastStep = computed(() => currentStep.value === GIP_WIZARD_STEPS.length - 1)

  const goToStep = (index: number) => {
    if (index < 0 || index > reachedStep.value) return
    currentStep.value = index
  }

  /** Moves on; leaving Requirements needs every required PDF attached */
  const nextStep = () => {
    if (currentStepMeta.value.key === 'requirements' && !validateFiles()) return
    if (isLastStep.value) return
    currentStep.value += 1
    reachedStep.value = Math.max(reachedStep.value, currentStep.value)
  }

  const previousStep = () => goToStep(currentStep.value - 1)

  /** Requirements with a file attached, for the review step */
  const attachedRequirements = computed(() =>
    requirements.value.filter((doc) => doc.pendingFileName || doc.savedFileName)
  )

  // ─── Progress tracker (after applying) ───
  const progressSteps = computed<GipProgressStep[]>(() => {
    const isRejected = status.value === 'Rejected'
    const isDeployed = status.value === 'Hired' || appointments.value.length > 0
    const isApproved = status.value === 'Approved' || isDeployed
    // Index of the step in progress; every step before it is done
    const current = isDeployed ? 4 : isApproved ? 3 : isRejected ? 2 : 1
    const states = (index: number): GipProgressStep['state'] => {
      if (isRejected && index === 2) return 'rejected'
      if (index < current) return 'completed'
      return index === current ? 'active' : 'upcoming'
    }
    return [
      { title: 'Submitted', state: states(0) },
      { title: 'Under review', state: states(1) },
      { title: isRejected ? 'Not approved' : 'Approved', state: states(2) },
      { title: 'Deployed', state: states(3) },
    ]
  })

  const reload = async () => {
    if (!applicantId.value) return
    resetPicks()
    currentStep.value = 0
    reachedStep.value = 0
    await store.fetchMyApplication(applicantId.value)
  }

  // The auth store may still be hydrating when the page opens
  watch(applicantId, () => void reload(), { immediate: true })

  // The NSRP form is generated and attached as soon as the form can take it
  watch(
    canUpload,
    (can) => {
      if (!can || isNsrpDismissed.value || isGeneratingNsrp.value) return
      if (documents.value[GIP_NSRP_DOCUMENT] || pendingFiles.value[GIP_NSRP_DOCUMENT]) return
      void generateNsrp()
    },
    { immediate: true }
  )

  // Matching profile documents (e.g. the resume) are attached as soon as the form can take them
  watch(
    [canUpload, profileDocuments],
    ([can]) => {
      if (can) attachProfileMatches()
    },
    { immediate: true }
  )

  return {
    requirements,
    attachmentAccept: GIP_ATTACHMENT_ACCEPT,
    attachmentMaxMb: GIP_ATTACHMENT_MAX_BYTES / 1024 / 1024,
    isLoading,
    errorMessage,
    isLocked,
    canUpload,
    hasPendingFiles,
    isSubmitting,
    hasApplied,
    status,
    statusDescription,
    statusRemarks,
    appliedOn,
    appointments,
    applicationDetails,
    applicantDetails,
    isGeneratingNsrp,
    wizardSteps: GIP_WIZARD_STEPS,
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
    submit,
    reload,
  }
}
