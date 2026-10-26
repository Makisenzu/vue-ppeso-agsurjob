import { computed, onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/common/auth'
import { useSiteContentStore } from '@/stores/common/siteContentStore'
import { useGipApplicationStore } from '@/stores/applicant/gipApplicationStore'
import { normalizeGipDocumentName, normalizeGipStatus } from '@/helpers/applicant/gipApplicationHelper'
import { GIP_ELIGIBILITY, GIP_REQUIRED_DOCUMENTS, GIP_STEPS } from '@/types/applicant/gipApplication'

// Built-in hero text, same as the GIP slide of the landing hero
const HERO = {
  eyebrow: 'Government Internship Program',
  title: 'Start your career in public service through GIP',
  description: 'Open to 18 to 30 year olds who finished at least high school or a tech-voc course.',
}

const STATUS_DESCRIPTIONS: Record<string, string> = {
  Pending: 'PESO is reviewing your application and documents.',
  Approved: 'You are approved for GIP. PESO will contact you about your appointment.',
  Rejected: 'Your application was not approved this time.',
  Hired: 'You are a GIP intern. Your appointments are listed below.',
}

const formatDate = (value?: string | null) =>
  value ? new Date(`${value}T00:00:00`).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'

/**
 * Applicant's GIP page: a hero over their own application and the program's eligibility, requirements
 * and steps. Read-only — PESO refers applicants to GIP and reviews their documents.
 */
export function useGipApplication() {
  const authStore = useAuthStore()
  const { applicantProfile } = storeToRefs(authStore)
  const siteContentStore = useSiteContentStore()
  const { programImages } = storeToRefs(siteContentStore)
  const store = useGipApplicationStore()
  const { myApplication, internships, isLoading, errorMessage } = storeToRefs(store)

  const applicantId = computed(() => applicantProfile.value?.id ?? null)
  const hasRegistryRecord = computed(() => applicantId.value !== null)

  // The hero uses the GIP photo of the landing PESO Programs gallery (Site Contents, migration 049)
  const hero = computed(() => ({ ...HERO, backgroundImage: programImages.value.gip ?? null }))

  const status = computed(() => normalizeGipStatus(myApplication.value?.status))
  const statusDescription = computed(() => STATUS_DESCRIPTIONS[status.value] ?? '')
  const statusRemarks = computed(() => (status.value === 'Rejected' ? (myApplication.value?.status_remarks ?? null) : null))

  const documents = computed(() => {
    const submitted = new Set((myApplication.value?.document_submitted ?? []).map(normalizeGipDocumentName))
    return GIP_REQUIRED_DOCUMENTS.map((name) => ({ name, submitted: submitted.has(name) }))
  })
  const submittedCount = computed(() => documents.value.filter((doc) => doc.submitted).length)

  const appointments = computed(() =>
    internships.value.flatMap((internship) =>
      internship.appointments.map((appointment) => ({
        ...appointment,
        period: `${formatDate(appointment.start_date)} – ${formatDate(appointment.end_date)}`,
      }))
    )
  )

  const appliedOn = computed(() => formatDate(myApplication.value?.created_at?.slice(0, 10)))

  const reload = async () => {
    if (!applicantId.value) return
    await store.fetchMyApplication(applicantId.value)
  }

  // The auth store may still be hydrating when the page opens
  watch(applicantId, () => void reload(), { immediate: true })

  onMounted(() => {
    void siteContentStore.loadProgramCards()
  })

  return {
    hero,
    eligibility: GIP_ELIGIBILITY,
    requirements: GIP_REQUIRED_DOCUMENTS,
    steps: GIP_STEPS,
    myApplication,
    isLoading,
    errorMessage,
    hasRegistryRecord,
    status,
    statusDescription,
    statusRemarks,
    documents,
    submittedCount,
    appointments,
    appliedOn,
    reload,
  }
}
