import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { watchDebounced } from '@vueuse/core'
import { differenceInCalendarDays, isValid, parseISO } from 'date-fns'
import { useApplicantVacancyStore } from '@/stores/applicant/vacancyStore'
import { formatJobPostingDate } from '@/helpers/employer/jobPostingHelper'
import {
  JOB_APPLICATION_STAGE_BADGE_CLASS,
  getJobApplicationStageLabel,
} from '@/helpers/common/jobVacancyApplicationHelper'
import type { OpenVacancyRow } from '@/types/applicant/jobVacancyApplication'

/** Days left before the deadline, colored by urgency; null when the vacancy has no end date */
function describeDeadline(validUntil: string | null): { label: string; class: string } | null {
  if (!validUntil) return null
  const date = parseISO(validUntil)
  if (!isValid(date)) return null
  const days = differenceInCalendarDays(date, new Date())
  const label = days <= 0 ? 'Closes today' : days === 1 ? '1 day left' : `${days} days left`
  const tone =
    days <= 2
      ? 'bg-destructive/10 text-destructive border-destructive/30'
      : days <= 7
        ? 'bg-warning/10 text-warning border-warning/30'
        : 'bg-muted text-muted-foreground border-border'
  return { label, class: tone }
}

/** "Posted today", "Posted 3 days ago" */
function describePosted(postingDate: string | null): string | null {
  if (!postingDate) return null
  const date = parseISO(postingDate)
  if (!isValid(date)) return null
  const days = differenceInCalendarDays(new Date(), date)
  if (days <= 0) return 'Posted today'
  if (days === 1) return 'Posted yesterday'
  if (days < 30) return `Posted ${days} days ago`
  return `Posted ${formatJobPostingDate(postingDate)}`
}

/** Vacancies page: open job vacancies of verified companies, searched and paged on the server */
export function useApplicantVacancies() {
  const store = useApplicantVacancyStore()
  const { rows, total, page, pageSize, isLoading, errorMessage } = storeToRefs(store)

  const searchInput = ref(store.search)
  watchDebounced(searchInput, (value) => store.setSearch(value), { debounce: 300 })

  const vacancies = computed(() =>
    rows.value.map((row: OpenVacancyRow) => {
      const positions = row.vacancy_count ?? 1
      const countdown = describeDeadline(row.valid_until)
      return {
        id: row.id,
        title: row.position_title,
        company: row.company_name,
        natureOfWork: row.nature_of_work,
        salary: row.salary?.trim() || 'Not stated',
        location: row.place_of_work?.trim() || 'Not stated',
        positions: `${positions} position${positions === 1 ? '' : 's'}`,
        deadline: row.valid_until ? formatJobPostingDate(row.valid_until) : 'Open until filled',
        countdown,
        postedAgo: describePosted(row.posting_date),
        hasApplied: !!row.my_application_id,
        stageLabel: row.my_application_id ? getJobApplicationStageLabel(row.my_stage, row.my_stage_name) : null,
        stageClass: row.my_stage ? JOB_APPLICATION_STAGE_BADGE_CLASS[row.my_stage] : '',
        to: { name: 'vacancy-application-form', params: { vacancyId: row.id } },
      }
    })
  )

  const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))
  const rangeLabel = computed(() => {
    if (total.value === 0) return '0 vacancies'
    const from = page.value * pageSize.value + 1
    const to = Math.min(total.value, from + rows.value.length - 1)
    return `${from}–${to} of ${total.value} vacanc${total.value === 1 ? 'y' : 'ies'}`
  })
  const canPreviousPage = computed(() => page.value > 0)
  const canNextPage = computed(() => page.value + 1 < pageCount.value)
  const previousPage = () => store.setPage(page.value - 1)
  const nextPage = () => store.setPage(page.value + 1)

  const hasSearch = computed(() => searchInput.value.trim() !== '')
  const clearSearch = () => {
    searchInput.value = ''
  }

  onMounted(() => {
    void store.fetchVacancies()
  })

  return {
    searchInput,
    hasSearch,
    clearSearch,
    vacancies,
    isLoading,
    errorMessage,
    reload: store.fetchVacancies,
    rangeLabel,
    pageCount,
    canPreviousPage,
    canNextPage,
    previousPage,
    nextPage,
  }
}
