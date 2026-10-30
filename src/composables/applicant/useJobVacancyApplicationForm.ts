import { computed, onScopeDispose, reactive, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/common/auth'
import { useJobVacancyApplicationStore } from '@/stores/applicant/jobVacancyApplicationStore'
import { useSignedDocumentUrls } from '@/composables/common/usePrivateDocuments'
import { describeGipApplicant, formatGipDate } from '@/helpers/applicant/gipApplicationHelper'
import { formatJobPostingDate } from '@/helpers/employer/jobPostingHelper'
import {
  listReusableProfileDocuments,
  normalizeRequirementLabel,
} from '@/helpers/applicant/applicantRequirementDocuments'
import {
  JOB_APPLICATION_STAGE_BADGE_CLASS,
  JOB_APPLICATION_STAGE_DESCRIPTIONS,
  getJobApplicationStageLabel,
  jobApplicationCode,
  toHiringProgress,
  toJobApplicationRequirements,
  validateJobApplicationAttachment,
} from '@/helpers/common/jobVacancyApplicationHelper'
import {
  JOB_APPLICATION_ATTACHMENT_ACCEPT,
  JOB_APPLICATION_ATTACHMENT_MAX_BYTES,
  JOB_APPLICATION_PROFILE_DOCUMENT_MATCHES,
  type JobApplicationPendingDocumentMap,
  type JobApplicationReusedDocumentMap,
} from '@/types/common/jobVacancyApplication'
import type { GipProgressStep, GipRequirementRow } from '@/composables/applicant/useGipApplicationForm'

/** Steps of applying; once applied, the page shows the progress tracker instead */
export const JOB_APPLICATION_WIZARD_STEPS = [
  { key: 'details', title: 'Your details', description: 'Check the details the employer will see.' },
  { key: 'requirements', title: 'Requirements', description: 'Attach a PDF of each requirement.' },
  { key: 'review', title: 'Review & submit', description: 'Check your files, then submit.' },
] as const

const plural = (count: number, unit: string) => `${count} ${unit}${count === 1 ? '' : 's'}`

/** 12 months = 1 year: 24 → "2 years", 18 → "1 year and 6 months", 0 / unset → "Not required" */
function formatExperience(months: number | null | undefined): string {
  if (!months || months <= 0) return NOT_REQUIRED
  const years = Math.floor(months / 12)
  const rest = months % 12
  if (!years) return plural(rest, 'month')
  return rest ? `${plural(years, 'year')} and ${plural(rest, 'month')}` : plural(years, 'year')
}

/** Shown for a qualification the employer left blank, so the applicant knows it isn't asked for */
const NOT_REQUIRED = 'Not required'
const orNotRequired = (value: string | null | undefined) => value?.trim() || NOT_REQUIRED

/**
 * Applicant's application to one job vacancy (BACKEND.md §18, like useTupadApplicationForm): they
 * read the job, apply with the documents the employer asks for (migration 088; no NSRP Form, which is only for PESO programs),
 * then follow the employer's stages.
 */
export function useJobVacancyApplicationForm() {
  const route = useRoute()
  const authStore = useAuthStore()
  const { user, applicantProfile } = storeToRefs(authStore)
  const store = useJobVacancyApplicationStore()
  const {
    vacancy,
    myApplication,
    documents,
    isLoading,
    errorMessage,
    isSubmitting,
    isLocked,
    deletingDocument,
  } = storeToRefs(store)

  const vacancyId = computed(() => String(route.params.vacancyId ?? ''))
  const applicantId = computed(() => applicantProfile.value?.id ?? null)

  // ─── Picked files ───
  /** Files picked in this visit, uploaded on submit */
  const pendingFiles = ref<JobApplicationPendingDocumentMap>({})
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
    const error = validateJobApplicationAttachment(file)
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
  const reusedDocs = ref<JobApplicationReusedDocumentMap>({})
  /** Requirements whose auto-attached profile document was removed, so it isn't attached again */
  const dismissedProfileMatches = reactive(new Set<string>())

  /** PDFs the applicant already uploaded on their profile */
  const profileDocuments = computed(() =>
    listReusableProfileDocuments(authStore.applicantRequirementMedia ?? [], authStore.applicantRequirements ?? [], {
      pdfOnly: true,
    })
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
    for (const { name: doc } of vacancyRequirements.value) {
      const labels = JOB_APPLICATION_PROFILE_DOCUMENT_MATCHES[normalizeRequirementLabel(doc)]
      if (!labels) continue
      if (dismissedProfileMatches.has(doc) || documents.value[doc] || pendingFiles.value[doc] || reusedDocs.value[doc]) {
        continue
      }
      const wanted = labels.map(normalizeRequirementLabel)
      const match = profileDocuments.value.find((item) => wanted.includes(normalizeRequirementLabel(item.label)))
      if (match) reusedDocs.value = { ...reusedDocs.value, [doc]: match }
    }
  }

  onScopeDispose(resetPicks)

  /** Removes a picked file, or the saved one when there's nothing picked */
  const removeFile = async (doc: string) => {
    if (reusedDocs.value[doc]) dismissedProfileMatches.add(doc)
    if (pendingFiles.value[doc] || reusedDocs.value[doc]) {
      clearPendingFile(doc)
      return
    }
    if (applicantId.value) await store.deleteDocument(vacancyId.value, applicantId.value, doc)
  }

  // ─── Requirements ───
  /** What the employer asks for, each required or optional */
  const vacancyRequirements = computed(() =>
    toJobApplicationRequirements(vacancy.value?.requirements ?? [], documents.value)
  )

  const requirements = computed<GipRequirementRow[]>(() =>
    vacancyRequirements.value.map(({ name, hint, isOptional }) => {
      const saved = documents.value[name]
      return {
        name,
        hint,
        isNsrp: false,
        isOptional,
        // No paper checklist here (GipRequirementList would say "Received by PESO"); the saved file shows instead
        isReceived: false,
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

  /** The vacancy is open (or applied to) and the applicant has a registry record */
  const canUpload = computed(() => !!applicantId.value && !!vacancy.value && !isLocked.value && !isLoading.value)
  const hasChanges = computed(
    () => Object.keys(pendingFiles.value).length > 0 || Object.keys(reusedDocs.value).length > 0
  )

  /** Every required document needs a file — the saved one or a newly picked one */
  const validateFiles = (): boolean => {
    let valid = true
    for (const { name, isOptional } of vacancyRequirements.value) {
      if (isOptional || pendingFiles.value[name] || reusedDocs.value[name] || documents.value[name]) continue
      fileErrors[name] = 'Attach a PDF of this document.'
      valid = false
    }
    return valid
  }

  const submit = async () => {
    const uploaderId = user.value?.id
    if (!uploaderId || !applicantId.value || !vacancy.value) return
    if (!validateFiles()) return
    if (myApplication.value && !hasChanges.value) return
    const saved = await store.submitApplication({
      vacancyId: vacancyId.value,
      applicantId: applicantId.value,
      uploaderId,
      pending: pendingFiles.value,
      reused: reusedDocs.value,
    })
    if (saved) resetPicks()
  }

  // ─── The job ───
  const job = computed(() => {
    const row = vacancy.value
    if (!row) return null
    const openings = row.vacancy_count ?? 1
    return {
      title: row.position_title,
      company: row.company_name,
      summary: [row.place_of_work, row.nature_of_work, `${openings} opening${openings === 1 ? '' : 's'}`]
        .filter(Boolean)
        .join(' · '),
      description: row.job_description?.trim() || null,
      skills: row.skills,
      /** The employer's hiring steps, shown before applying so the applicant knows what's ahead */
      hiringSteps: row.stages.map((step) => step.stage_name),
      /** What to prepare before applying: the employer's requirements */
      documents: toJobApplicationRequirements(row.requirements),
      attachments: row.attachments,
      /**
       * Label → value. Qualifications always show ("Not required" when blank); salary, deadline, education,
       * eligibility and PWD are left out when blank. Languages are not shown to applicants.
       */
      details: [
        { label: 'Salary rate / grade', value: row.salary?.trim() ?? '' },
        { label: 'Positions available', value: String(openings) },
        { label: 'Deadline', value: row.valid_until ? formatJobPostingDate(row.valid_until) : '' },
        { label: 'Education', value: [row.educational_level, row.course_shs_strand].filter(Boolean).join(' · ') },
        { label: 'Work experience', value: formatExperience(row.work_experience_months) },
        { label: 'Eligibility', value: row.eligibility ?? '' },
        { label: 'License', value: orNotRequired(row.license) },
        { label: 'Certification', value: orNotRequired(row.certification) },
        { label: 'Other qualifications', value: orNotRequired((row.other_qualifications ?? []).join(', ')) },
        { label: 'Open to PWD', value: row.accepts_pwd ? 'Yes' : '' },
      ].filter((detail) => detail.value),
    }
  })

  // ─── Status ───
  const hasApplied = computed(() => !!myApplication.value)
  const stage = computed(() => myApplication.value?.stage ?? 'applied')
  /** Name of the hiring step the applicant is at */
  const stepName = computed(
    () => vacancy.value?.stages.find((step) => step.id === myApplication.value?.stage_id)?.stage_name ?? null,
  )
  const stageLabel = computed(() => getJobApplicationStageLabel(stage.value, stepName.value))
  const stageClass = computed(() => JOB_APPLICATION_STAGE_BADGE_CLASS[stage.value])
  const stageDescription = computed(() =>
    stage.value === 'in_progress' && !isLocked.value
      ? 'The employer is screening your application. You can still change your files until they move you on.'
      : JOB_APPLICATION_STAGE_DESCRIPTIONS[stage.value],
  )
  const statusRemarks = computed(() => (stage.value === 'rejected' ? (myApplication.value?.status_remarks ?? null) : null))
  const appliedOn = computed(() => formatGipDate(myApplication.value?.created_at))

  /** Details of the application, label → value */
  const applicationDetails = computed(() => {
    const application = myApplication.value
    if (!application) return []
    const attached = requirements.value.filter((doc) => doc.savedFileName).length
    return [
      { label: 'Reference no.', value: jobApplicationCode(application.id, application.created_at) },
      { label: 'Position', value: vacancy.value?.position_title ?? '—' },
      { label: 'Date applied', value: formatGipDate(application.created_at) },
      { label: 'Last updated', value: formatGipDate(application.updated_at ?? application.created_at) },
      { label: 'Applied through', value: 'Online, through AGSURJOBS' },
      { label: 'Requirements', value: `${attached} of ${requirements.value.length} attached` },
    ]
  })

  /** The applicant's own details the employer sees, from their profile */
  const applicantDetails = computed(() => (applicantProfile.value ? describeGipApplicant(applicantProfile.value) : []))

  // ─── Application wizard (before applying) ───
  /** The page first shows only the job; "Apply now" opens the wizard */
  const isApplying = ref(false)
  const startApplying = () => {
    isApplying.value = true
    currentStep.value = 0
  }
  const stopApplying = () => {
    isApplying.value = false
  }

  const currentStep = ref(0)
  /** Furthest step opened so far; the stepper only jumps back to steps already reached */
  const reachedStep = ref(0)
  const currentStepMeta = computed(() => JOB_APPLICATION_WIZARD_STEPS[currentStep.value]!)
  const isLastStep = computed(() => currentStep.value === JOB_APPLICATION_WIZARD_STEPS.length - 1)

  const goToStep = (index: number) => {
    if (index < 0 || index > reachedStep.value) return
    currentStep.value = index
  }

  /** Moves on; leaving Requirements needs every required file */
  const nextStep = () => {
    if (currentStepMeta.value.key === 'requirements' && !validateFiles()) return
    if (isLastStep.value) return
    currentStep.value += 1
    reachedStep.value = Math.max(reachedStep.value, currentStep.value)
  }

  /** Back from the first step returns to the job */
  const previousStep = () => (currentStep.value === 0 ? stopApplying() : goToStep(currentStep.value - 1))

  const attachedRequirements = computed(() =>
    requirements.value.filter((doc) => doc.pendingFileName || doc.savedFileName)
  )

  // ─── Progress tracker (after applying) ───
  /** Submitted, then the employer's hiring steps for this vacancy (migration 089) */
  const progressSteps = computed<GipProgressStep[]>(() =>
    toHiringProgress(vacancy.value?.stages ?? [], stage.value, myApplication.value?.stage_id ?? null),
  )

  const reload = async () => {
    if (!applicantId.value || !vacancyId.value) return
    resetPicks()
    isApplying.value = false
    currentStep.value = 0
    reachedStep.value = 0
    await store.load(vacancyId.value, applicantId.value)
  }

  // The auth store may still be hydrating when the page opens; another vacancy reuses the page
  watch([applicantId, vacancyId], () => void reload(), { immediate: true })

  // Matching profile documents are attached as soon as the form can take them
  watch(
    [canUpload, profileDocuments, vacancyRequirements],
    ([can]) => {
      if (can) attachProfileMatches()
    },
    { immediate: true }
  )

  onScopeDispose(store.reset)

  // Opened from Application Status (?from=application): go back there, otherwise to Vacancies
  const backLink = computed(() =>
    route.query.from === 'application'
      ? { to: { name: 'application' }, label: 'Application Status' }
      : { to: { name: 'vacancies' }, label: 'Vacancies' }
  )

  return {
    backLink,
    job,
    requirements,
    attachmentAccept: JOB_APPLICATION_ATTACHMENT_ACCEPT,
    attachmentMaxMb: JOB_APPLICATION_ATTACHMENT_MAX_BYTES / 1024 / 1024,
    isLoading,
    errorMessage,
    isLocked,
    canUpload,
    hasChanges,
    isSubmitting,
    hasApplied,
    stageLabel,
    stageClass,
    stageDescription,
    statusRemarks,
    appliedOn,
    applicationDetails,
    applicantDetails,
    isApplying,
    startApplying,
    wizardSteps: JOB_APPLICATION_WIZARD_STEPS,
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
    submit,
    reload,
  }
}
