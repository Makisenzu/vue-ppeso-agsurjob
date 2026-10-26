import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/common/auth'
import { useApplicationStatusStore } from '@/stores/applicant/applicationStatusStore'
import {
  APPLICATION_STAGE_LABELS,
  applicationProgress,
} from '@/helpers/applicant/applicationStatusHelper'
import { formatGipDateTime } from '@/helpers/applicant/gipApplicationHelper'
import type { ApplicationFilter } from '@/types/applicant/applicationStatus'

const FILTERS: { value: ApplicationFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'program', label: 'PESO Programs' },
  { value: 'vacancy', label: 'Vacancies' },
]

/** Application Status page: every program and vacancy application in one list, with its progress. */
export function useApplicationStatus() {
  const authStore = useAuthStore()
  const { user, applicantProfile } = storeToRefs(authStore)
  const store = useApplicationStatusStore()
  const { applications, isLoading, errorMessage } = storeToRefs(store)

  const filter = ref<ApplicationFilter>('all')

  const counts = computed(() => ({
    all: applications.value.length,
    program: applications.value.filter((item) => item.kind === 'program').length,
    vacancy: applications.value.filter((item) => item.kind === 'vacancy').length,
  }))

  const filters = computed(() => FILTERS.map((item) => ({ ...item, count: counts.value[item.value] })))

  const items = computed(() =>
    applications.value
      .filter((item) => filter.value === 'all' || item.kind === filter.value)
      .map((item) => ({
        ...item,
        stageLabel: APPLICATION_STAGE_LABELS[item.stage],
        progress: applicationProgress(item.stage),
        appliedOn: formatGipDateTime(item.appliedAt),
        updatedOn: formatGipDateTime(item.updatedAt),
      }))
  )

  const emptyMessage = computed(() => {
    if (filter.value === 'vacancy') return 'Your job applications will appear here once you apply to a vacancy.'
    if (filter.value === 'program') return 'Apply to a PESO program (GIP, SPES, TUPAD) and it will appear here.'
    return 'Applications to PESO programs and job vacancies will appear here.'
  })

  const reload = async () => {
    const applicantId = applicantProfile.value?.id
    const profileId = user.value?.id
    if (!applicantId || !profileId) return
    await store.fetchApplications(applicantId, profileId)
  }

  // The auth store may still be hydrating when the page opens
  watch(() => applicantProfile.value?.id, () => void reload(), { immediate: true })

  return { filter, filters, items, isLoading, errorMessage, emptyMessage, reload }
}
