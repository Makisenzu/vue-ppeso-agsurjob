import { computed, onScopeDispose, reactive, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/common/auth'
import { useSpesFormStore } from '@/stores/applicant/spesFormStore'
import { useSpesFormSteps } from '@/composables/common/useSpesFormSteps'
import type { GipProgressStep, GipRequirementRow } from '@/composables/applicant/useGipApplicationForm'
import {
  buildSpesFormPayload,
  buildSpesPrefill,
  describeSpesApplicant,
  formatSpesFormDate,
  spesApplicationCode,
  validateSpesAttachment,
  type SpesPrefillSource,
} from '@/helpers/common/spesFormHelper'
import { listReusableProfileDocuments, normalizeRequirementLabel } from '@/helpers/applicant/applicantRequirementDocuments'
import {
  SPES_ATTACHMENT_ACCEPT,
  SPES_ATTACHMENT_MIME_TYPES,
  SPES_DOCUMENT_REQUIREMENTS,
  type SpesCompletionReportType,
  type SpesDocumentKey,
  type SpesFormInsert,
  type SpesPendingAttachmentMap,
  type SpesReusedAttachmentMap,
  type SpesStudentCategory,
} from '@/types/common/spesForm'
import { SPES_PROFILE_DOCUMENT_MATCHES, spesRequirementsFor } from '@/types/common/spesProgram'

/** Steps of applying; once applied, the page shows the progress tracker instead (same as GIP_WIZARD_STEPS) */
export const SPES_WIZARD_STEPS = [
  { key: 'details', title: 'Your details', description: 'Your SPES form, saved for your future applications.' },
  { key: 'requirements', title: 'Requirements', description: 'Attach an image or PDF of each requirement.' },
  { key: 'review', title: 'Review & submit', description: 'Check your files, then submit your application.' },
] as const

export const SPES_STATUS_DESCRIPTIONS: Record<string, string> = {
  Pending: 'PESO is reviewing your requirements. You can still replace a file until then.',
  Approved: 'You are approved for SPES. PESO will contact you about your appointment.',
  Rejected: 'Your application was not approved this time.',
  Appointed: 'You are a SPES beneficiary. Your appointment is listed below.',
}

const isSpesFileType = (mimeType: string | null, fileName: string) =>
  (SPES_ATTACHMENT_MIME_TYPES as readonly string[]).includes(mimeType ?? '') || /\.(pdf|jpe?g|png|webp)$/i.test(fileName)

const keyOf = (label: string) => SPES_DOCUMENT_REQUIREMENTS.find((doc) => doc.label === label)?.key

/**
 * Applicant's SPES application, laid out like GIP (BACKEND.md §18): a first application fills in the
 * SPES form, which is saved for later rounds and can be edited any time (ApplicantSpesForm.vue);
 * every round attaches the requirements, then follows its status, orientation and appointment here.
 */
export function useSpesApplicationForm() {
  const route = useRoute()
  const authStore = useAuthStore()
  const { user, applicantProfile } = storeToRefs(authStore)
  const store = useSpesFormStore()
  const {
    myForm,
    attachments,
    myAppointments,
    currentAppointment,
    completionReports,
    busyReportType,
    isLoading,
    isSubmitting,
    errorMessage,
  } = storeToRefs(store)

  const profileId = computed(() => user.value?.id ?? null)

  // ─── Round ───
  /** Applying again with the saved details, after a Rejected or finished round */
  const isReapplying = ref(false)
  const hasApplied = computed(() => !!myForm.value && !isReapplying.value)
  const status = computed(() => myForm.value?.status || 'Pending')
  const appliedAt = computed(() => myForm.value?.applied_at ?? myForm.value?.created_at ?? null)
  const appliedYear = computed(() => (appliedAt.value ? new Date(appliedAt.value).getFullYear() : new Date().getFullYear()))
  /** This round's appointment; a returning beneficiary also has past years' */
  const isAppointed = computed(() => myAppointments.value.some((appointment) => appointment.spes_year >= appliedYear.value))

  /** Same rule as reapply_spes_form (migration 067) */
  const canReapply = computed(() => {
    const form = myForm.value
    if (!form || isReapplying.value) return false
    if (form.status === 'Rejected') return true
    if (form.status !== 'Approved' || myAppointments.value.some((appointment) => appointment.status === 'Active')) return false
    return (myAppointments.value[0]?.spes_year ?? appliedYear.value) < new Date().getFullYear()
  })

  // ─── Your details ───
  /** SPES form of a first application: filled in on the details step, saved on submit */
  const detailsForm = useSpesFormSteps({ withRequirements: false })
  const detailsDraft = ref<Omit<SpesFormInsert, 'profile_id'> | null>(null)
  const hasSavedDetails = computed(() => !!myForm.value)
  const savedDetails = computed(() => (myForm.value ? describeSpesApplicant(myForm.value) : []))
  const studentCategory = computed(
    () => (myForm.value?.student_category ?? detailsDraft.value?.student_category ?? null) as SpesStudentCategory | null
  )

  // ─── Wizard ───
  const currentStep = ref(0)
  /** Furthest step opened so far; the stepper only jumps back to steps already reached */
  const reachedStep = ref(0)
  const currentStepMeta = computed(() => SPES_WIZARD_STEPS[currentStep.value]!)
  const isLastStep = computed(() => currentStep.value === SPES_WIZARD_STEPS.length - 1)

  const goToStep = (index: number) => {
    if (index < 0 || index > reachedStep.value) return
    currentStep.value = index
  }

  const advance = () => {
    if (isLastStep.value) return
    currentStep.value += 1
    reachedStep.value = Math.max(reachedStep.value, currentStep.value)
  }

  /** Last sub-step of the SPES form on a first application: keep the answers and move on */
  const confirmDetails = detailsForm.createSubmitHandler((values) => {
    detailsDraft.value = buildSpesFormPayload(values)
    advance()
  })

  /** Moves on; leaving Requirements needs every required file attached */
  const nextStep = () => {
    if (currentStepMeta.value.key === 'details' && !hasSavedDetails.value && !detailsDraft.value) return
    if (currentStepMeta.value.key === 'requirements' && !validateFiles()) return
    advance()
  }

  const previousStep = () => goToStep(currentStep.value - 1)

  // ─── Picked files ───
  const pendingFiles = ref<SpesPendingAttachmentMap>({})
  /** Profile documents chosen for a requirement, copied into the application on submit */
  const reusedDocs = ref<SpesReusedAttachmentMap>({})
  /** Saved files the applicant removed; dropped when they submit or save */
  const removedSaved = reactive(new Set<SpesDocumentKey>())
  /** Requirements whose auto-attached profile document was removed, so it isn't attached again */
  const dismissedMatches = reactive(new Set<SpesDocumentKey>())
  const fileErrors = reactive<Partial<Record<SpesDocumentKey, string>>>({})
  // Object URLs for viewing picked files; revoked when the file is cleared or the page closes
  const previewUrls = reactive<Partial<Record<SpesDocumentKey, string>>>({})

  const revokePreview = (key: SpesDocumentKey) => {
    if (previewUrls[key]) URL.revokeObjectURL(previewUrls[key]!)
    delete previewUrls[key]
  }

  const clearPick = (key: SpesDocumentKey) => {
    const { [key]: _file, ...files } = pendingFiles.value
    pendingFiles.value = files
    const { [key]: _reused, ...reused } = reusedDocs.value
    reusedDocs.value = reused
    revokePreview(key)
    delete fileErrors[key]
  }

  const resetPicks = () => {
    for (const doc of SPES_DOCUMENT_REQUIREMENTS) clearPick(doc.key)
    removedSaved.clear()
    dismissedMatches.clear()
  }

  onScopeDispose(resetPicks)

  const savedFor = (key: SpesDocumentKey) => (removedSaved.has(key) ? null : (attachments.value[key] ?? null))
  const hasFile = (key: SpesDocumentKey) => !!pendingFiles.value[key] || !!reusedDocs.value[key] || !!savedFor(key)

  const selectFile = (name: string, file: File | null | undefined) => {
    const key = keyOf(name)
    if (!key) return
    delete fileErrors[key]
    if (!file) return
    const error = validateSpesAttachment(file)
    if (error) {
      fileErrors[key] = error
      return
    }
    clearPick(key)
    previewUrls[key] = URL.createObjectURL(file)
    pendingFiles.value = { ...pendingFiles.value, [key]: file }
  }

  /** Removes a picked file, or the saved one when there's nothing picked */
  const removeFile = (name: string) => {
    const key = keyOf(name)
    if (!key) return
    if (reusedDocs.value[key]) dismissedMatches.add(key)
    if (pendingFiles.value[key] || reusedDocs.value[key]) {
      clearPick(key)
      return
    }
    removedSaved.add(key)
  }

  // ─── Documents already on the profile ───
  const profileDocuments = computed(() =>
    listReusableProfileDocuments(authStore.applicantRequirementMedia ?? [], authStore.applicantRequirements ?? []).filter(
      (document) => isSpesFileType(document.mimeType, document.fileName)
    )
  )

  const attachProfileDocument = (name: string, profileDocumentId: string) => {
    const key = keyOf(name)
    const document = profileDocuments.value.find((item) => item.id === profileDocumentId)
    if (!key || !document) return
    clearPick(key)
    reusedDocs.value = { ...reusedDocs.value, [key]: document }
  }

  /** Attaches the profile document of the same kind to each requirement that has nothing yet */
  const attachProfileMatches = () => {
    for (const [key, labels] of Object.entries(SPES_PROFILE_DOCUMENT_MATCHES) as [SpesDocumentKey, readonly string[]][]) {
      if (dismissedMatches.has(key) || hasFile(key)) continue
      const wanted = labels.map(normalizeRequirementLabel)
      const match = profileDocuments.value.find((item) => wanted.includes(normalizeRequirementLabel(item.label)))
      if (match) reusedDocs.value = { ...reusedDocs.value, [key]: match }
    }
  }

  // ─── Requirements ───
  /** Every SPES document; the OSY certification is optional unless the applicant is out of school */
  const requiredDocuments = computed(() => spesRequirementsFor(studentCategory.value))

  const requirements = computed<GipRequirementRow[]>(() =>
    requiredDocuments.value.map((doc) => {
      const saved = savedFor(doc.key)
      const pending = pendingFiles.value[doc.key]
      const reused = reusedDocs.value[doc.key]
      return {
        name: doc.label,
        hint: doc.hint,
        isNsrp: false,
        isOptional: doc.isOptional,
        isReceived: !!saved,
        savedFileName: saved?.filename ?? null,
        savedFileUrl: saved?.url ?? null,
        uploadedAt: null,
        pendingFileName: pending?.name ?? reused?.fileName ?? null,
        pendingFileUrl: previewUrls[doc.key] ?? reused?.url ?? null,
        isFromProfile: !pending && !!reused,
        isDeleting: false,
        error: fileErrors[doc.key] ?? null,
      }
    })
  )

  /** Files change while applying, or while PESO hasn't reviewed the application (can_edit_spes_form, 017) */
  const canUpload = computed(
    () => !!profileId.value && !isLoading.value && (!hasApplied.value || status.value === 'Pending')
  )
  const hasPendingChanges = computed(
    () => Object.keys(pendingFiles.value).length > 0 || Object.keys(reusedDocs.value).length > 0 || removedSaved.size > 0
  )

  const validateFiles = (): boolean => {
    let valid = true
    for (const doc of requiredDocuments.value) {
      if (!doc.isOptional && !hasFile(doc.key)) {
        fileErrors[doc.key] = 'Attach an image or PDF of this document.'
        valid = false
      }
    }
    return valid
  }

  /** Requirements with a file attached, for the review step */
  const attachedRequirements = computed(() => requirements.value.filter((doc) => doc.pendingFileName || doc.savedFileName))

  watch(
    [profileDocuments, canUpload, () => myForm.value?.id],
    ([, can]) => {
      if (can) attachProfileMatches()
    },
    { immediate: true }
  )

  // ─── Submit ───
  const submit = async () => {
    if (!profileId.value || !validateFiles()) return
    if (hasApplied.value && !hasPendingChanges.value) return
    const details = myForm.value ? null : detailsDraft.value
    if (!myForm.value && !details) {
      currentStep.value = 0
      return
    }

    const checked = Object.fromEntries(SPES_DOCUMENT_REQUIREMENTS.map((doc) => [doc.key, hasFile(doc.key)])) as Record<
      SpesDocumentKey,
      boolean
    >

    const saved = await store.submitApplication({
      profileId: profileId.value,
      details,
      isReapplying: isReapplying.value,
      checked,
      pending: pendingFiles.value,
      reused: reusedDocs.value,
    })
    if (!saved) return
    isReapplying.value = false
    detailsDraft.value = null
    resetPicks()
    currentStep.value = 0
    reachedStep.value = 0
  }

  /** A new round with the saved details: back to the wizard */
  const startReapply = () => {
    if (!canReapply.value) return
    resetPicks()
    isReapplying.value = true
    currentStep.value = 0
    reachedStep.value = 0
  }

  const cancelReapply = () => {
    resetPicks()
    isReapplying.value = false
  }

  // ─── Status ───
  const statusLabel = computed(() => (isAppointed.value ? 'Appointed' : status.value))
  const statusDescription = computed(() => SPES_STATUS_DESCRIPTIONS[statusLabel.value] ?? '')
  const statusRemarks = computed(() => (status.value === 'Rejected' ? (myForm.value?.remarks ?? null) : null))
  const appliedOn = computed(() => formatSpesFormDate(appliedAt.value))

  /** When an approved applicant comes to the office for orientation (migration 067); gone once appointed */
  const orientation = computed(() => {
    const at = status.value === 'Approved' && !isAppointed.value ? myForm.value?.orientation_at : null
    const date = at ? new Date(at) : null
    if (!date || Number.isNaN(date.getTime())) return null
    return {
      date: date.toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
      time: date.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' }),
      note: myForm.value?.orientation_note?.trim() || null,
    }
  })

  /** Details of the application, label → value */
  const applicationDetails = computed(() => {
    const form = myForm.value
    if (!form) return []
    const submitted = requiredDocuments.value.filter((doc) => !!attachments.value[doc.key]).length
    return [
      { label: 'Reference no.', value: spesApplicationCode(form.id, appliedAt.value) },
      { label: 'Program', value: 'Special Program for Employment of Students (SPES)' },
      { label: 'Date applied', value: formatSpesFormDate(appliedAt.value) },
      { label: 'Last updated', value: formatSpesFormDate(form.updated_at ?? form.created_at) },
      { label: 'Requirements', value: `${submitted} of ${requiredDocuments.value.length} submitted` },
    ]
  })

  // ─── Progress tracker (after applying) ───
  const progressSteps = computed<GipProgressStep[]>(() => {
    const isRejected = status.value === 'Rejected'
    const isApproved = status.value === 'Approved' || isAppointed.value
    // Index of the step in progress; every step before it is done
    const current = isAppointed.value ? 4 : isApproved ? 3 : isRejected ? 2 : 1
    const states = (index: number): GipProgressStep['state'] => {
      if (isRejected && index === 2) return 'rejected'
      if (index < current) return 'completed'
      return index === current ? 'active' : 'upcoming'
    }
    return [
      { title: 'Submitted', state: states(0) },
      { title: 'Under review', state: states(1) },
      { title: isRejected ? 'Not approved' : 'Approved', state: states(2) },
      { title: 'Appointed', state: states(3) },
    ]
  })

  // ─── Appointment & completion reports (DTR / Accomplishment Report) ───
  /** Reports can be sent while the appointment runs; afterwards they are read-only. */
  const canSubmitReports = computed(() => currentAppointment.value?.status === 'Active')
  const onReportPicked = (type: SpesCompletionReportType, file: File) => {
    if (profileId.value) void store.uploadCompletionReport(profileId.value, type, file)
  }
  const onReportRemoved = (type: SpesCompletionReportType) => {
    void store.removeCompletionReport(type)
  }

  // Opened from Application Status (?from=application): go back there, otherwise to the SPES page
  const backLink = computed(() =>
    route.query.from === 'application'
      ? { to: { name: 'application' }, label: 'Application Status' }
      : { to: { name: 'spes-application' }, label: 'Special Program for Employment of Students' }
  )

  // ─── Load ───
  const load = async () => {
    if (!profileId.value) return
    await store.fetchMyForm(profileId.value)
    // A first application starts from the jobseeker profile
    if (!myForm.value) {
      detailsForm.loadValues(buildSpesPrefill(applicantProfile.value as SpesPrefillSource | null, user.value?.email))
    }
  }

  watch(profileId, () => void load(), { immediate: true })

  return {
    backLink,
    isLoading,
    errorMessage,
    isSubmitting,
    // round
    hasApplied,
    isReapplying,
    canReapply,
    startReapply,
    cancelReapply,
    // details
    detailsForm,
    hasSavedDetails,
    savedDetails,
    confirmDetails,
    // wizard
    wizardSteps: SPES_WIZARD_STEPS,
    currentStep,
    reachedStep,
    currentStepMeta,
    isLastStep,
    goToStep,
    nextStep,
    previousStep,
    // requirements
    requirements,
    attachedRequirements,
    attachmentAccept: SPES_ATTACHMENT_ACCEPT,
    profileDocuments,
    canUpload,
    hasPendingChanges,
    selectFile,
    removeFile,
    attachProfileDocument,
    submit,
    // status
    statusLabel,
    statusDescription,
    statusRemarks,
    appliedOn,
    orientation,
    applicationDetails,
    progressSteps,
    // appointment
    currentAppointment,
    completionReports,
    busyReportType,
    canSubmitReports,
    onReportPicked,
    onReportRemoved,
    reload: load,
  }
}
