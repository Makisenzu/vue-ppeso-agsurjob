import { computed, onMounted, reactive, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/common/auth'
import { useSiteContentStore } from '@/stores/common/siteContentStore'
import { useGipApplicationStore } from '@/stores/applicant/gipApplicationStore'
import {
  normalizeGipDocumentName,
  normalizeGipStatus,
  validateGipAttachment,
} from '@/helpers/applicant/gipApplicationHelper'
import {
  GIP_ABOUT,
  GIP_ATTACHMENT_ACCEPT,
  GIP_ATTACHMENT_MAX_BYTES,
  GIP_FACTS,
  GIP_HERO,
  GIP_NSRP_DOCUMENT,
  GIP_OPTIONAL_DOCUMENTS,
  GIP_REQUIRED_DOCUMENTS,
  GIP_UPLOAD_DOCUMENTS,
  type GipPendingDocumentMap,
} from '@/types/common/gipProgram'

const STATUS_DESCRIPTIONS: Record<string, string> = {
  Pending: 'PESO is reviewing your requirements. You can still replace a file until then.',
  Approved: 'You are approved for GIP. PESO will contact you about your appointment.',
  Rejected: 'Your application was not approved this time.',
  Hired: 'You are a GIP intern. Your appointments are listed below.',
}

const formatDate = (value?: string | null) =>
  value ? new Date(`${value}T00:00:00`).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'

/** One row of the requirements list */
export interface GipRequirementRow {
  name: string
  /** NSRP: the registry record, filled in after signing up; never uploaded */
  isNsrp: boolean
  isOptional: boolean
  /** Ticked in PESO's checklist (uploaded here, or handed in on paper) */
  isReceived: boolean
  savedFileName: string | null
  savedFileUrl: string | null
  pendingFileName: string | null
  error: string | null
}

/**
 * GIP program page, shared by the public /gip page and the applicant's GIP page: a hero, what GIP is,
 * and its requirements. Visitors get "Log in to apply"; applicants apply by uploading soft copies of
 * the requirements right in the list (NSRP is already their profile), then follow their status there.
 */
export function useLandingGip() {
  const authStore = useAuthStore()
  const { user, applicantProfile } = storeToRefs(authStore)
  const siteContentStore = useSiteContentStore()
  const { programImages } = storeToRefs(siteContentStore)
  const store = useGipApplicationStore()
  const { myApplication, documents, internships, isLoading, errorMessage, isSubmitting, isLocked } = storeToRefs(store)

  const isSignedIn = computed(() => authStore.isAuthenticated)
  // Other roles (PESO staff, employers) only read the program details
  const isApplicant = computed(() => authStore.isAuthenticated && authStore.userRole === 'applicant')
  const applicantId = computed(() => (isApplicant.value ? (applicantProfile.value?.id ?? null) : null))

  // The hero uses the GIP photo of the landing PESO Programs gallery (Site Contents, migration 049)
  const hero = computed(() => ({ ...GIP_HERO, backgroundImage: programImages.value.gip ?? null }))

  // ─── Picked files ───
  /** Files picked in this visit, uploaded on submit */
  const pendingFiles = ref<GipPendingDocumentMap>({})
  const fileErrors = reactive<Record<string, string>>({})

  const selectFile = (doc: string, file: File | null | undefined) => {
    delete fileErrors[doc]
    if (!file) return
    const error = validateGipAttachment(file)
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

  const resetPicks = () => {
    pendingFiles.value = {}
    for (const key of Object.keys(fileErrors)) delete fileErrors[key]
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
        pendingFileName: pendingFiles.value[name]?.name ?? null,
        error: fileErrors[name] ?? null,
      }
    })
  )

  /** Visitors see the plain list; applicants get upload slots while they can still edit */
  const canUpload = computed(() => isApplicant.value && !!applicantId.value && !isLocked.value && !isLoading.value)
  const hasPendingFiles = computed(() => Object.keys(pendingFiles.value).length > 0)

  /** Every required soft copy needs a file — the saved one or a newly picked one. */
  const validateFiles = (): boolean => {
    let valid = true
    for (const doc of GIP_UPLOAD_DOCUMENTS) {
      if (GIP_OPTIONAL_DOCUMENTS.includes(doc)) continue
      if (!pendingFiles.value[doc] && !documents.value[doc]) {
        fileErrors[doc] = 'Upload a soft copy of this document.'
        valid = false
      }
    }
    return valid
  }

  const submit = async () => {
    const uploaderId = user.value?.id
    if (!uploaderId || !validateFiles()) return
    if (myApplication.value && !hasPendingFiles.value) return
    if (await store.submitDocuments(uploaderId, pendingFiles.value)) resetPicks()
  }

  // ─── Application status ───
  const hasApplied = computed(() => !!myApplication.value)
  const status = computed(() => normalizeGipStatus(myApplication.value?.status))
  const statusDescription = computed(() => STATUS_DESCRIPTIONS[status.value] ?? '')
  const statusRemarks = computed(() => (status.value === 'Rejected' ? (myApplication.value?.status_remarks ?? null) : null))
  const appliedOn = computed(() => formatDate(myApplication.value?.created_at?.slice(0, 10)))

  const appointments = computed(() =>
    internships.value.flatMap((internship) =>
      internship.appointments.map((appointment) => ({
        ...appointment,
        period: `${formatDate(appointment.start_date)} – ${formatDate(appointment.end_date)}`,
      }))
    )
  )

  const reload = async () => {
    if (!applicantId.value) return
    resetPicks()
    await store.fetchMyApplication(applicantId.value)
  }

  // The auth store may still be hydrating when the page opens
  watch(applicantId, () => void reload(), { immediate: true })

  onMounted(() => {
    void siteContentStore.loadProgramCards()
  })

  return {
    hero,
    about: GIP_ABOUT,
    facts: GIP_FACTS,
    requirements,
    attachmentAccept: GIP_ATTACHMENT_ACCEPT,
    attachmentMaxMb: GIP_ATTACHMENT_MAX_BYTES / 1024 / 1024,
    isSignedIn,
    isApplicant,
    isLoading,
    errorMessage,
    canUpload,
    hasPendingFiles,
    isSubmitting,
    hasApplied,
    status,
    statusDescription,
    statusRemarks,
    appliedOn,
    appointments,
    selectFile,
    clearPendingFile,
    submit,
    reload,
  }
}
