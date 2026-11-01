import { computed, h, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { watchDebounced } from '@vueuse/core'
import type { ColumnDef } from '@tanstack/vue-table'
import { getCoreRowModel, useVueTable } from '@tanstack/vue-table'
import { Eye, Star } from '@lucide/vue'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { mediaService } from '@/services/common/mediaService'
import { getInitials } from '@/helpers/peso/provincialPeso/gipHelper'
import type { SwipeAction } from '@/components/SwipeRow.vue'
import type { SwipeCard } from '@/types/common/swipeCard'
import { useJobApplicantStore } from '@/stores/employer/jobApplicantStore'
import { formatGipDate } from '@/helpers/applicant/gipApplicationHelper'
import { formatJobPostingDate, getJobPostingStatusLabel } from '@/helpers/employer/jobPostingHelper'
import { JOB_APPLICATION_STAGE_BADGE_CLASS, getJobApplicationStageLabel } from '@/helpers/common/jobVacancyApplicationHelper'
import type { ApplicantStageFilter, VacancyApplicantRow } from '@/types/employer/jobApplicant'

/** Applicants of one job posting: step counts and the server-paged list; Review opens the applicant's page */
export function useVacancyApplicants() {
  const route = useRoute()
  const router = useRouter()
  const store = useJobApplicantStore()
  const {
    vacancy,
    applicants,
    total,
    stageCounts,
    stageFilter,
    shortlistedOnly,
    shortlistCount,
    shortlistBusyIds,
    page,
    pageSize,
    isLoading,
    errorMessage,
  } = storeToRefs(store)

  const vacancyId = computed(() => String(route.params.vacancyId ?? ''))

  // ─── Header ───
  const vacancyHeader = computed(() => {
    const row = vacancy.value
    if (!row) return null
    const openings = row.vacancy_count ?? 1
    return {
      title: row.position_title,
      summary: [
        getJobPostingStatusLabel(row.status),
        `${openings} opening${openings === 1 ? '' : 's'}`,
        row.valid_until ? `until ${formatJobPostingDate(row.valid_until)}` : null,
      ]
        .filter(Boolean)
        .join(' · '),
    }
  })

  // ─── Step chips: click to filter (All, the employer's hiring steps from Paper Screening, Not selected) ───
  const steps = computed(() => [...(vacancy.value?.stages ?? [])].sort((a, b) => a.sort_order - b.sort_order))

  const stageCards = computed(() => [
    { key: 'all', label: 'All', value: stageCounts.value.all },
    ...steps.value.map((step, index) => ({
      key: step.id,
      label: `${index + 1}. ${step.stage_name}`,
      value: stageCounts.value.byStep[step.id] ?? 0,
    })),
    { key: 'rejected', label: 'Not selected', value: stageCounts.value.rejected },
  ])

  const selectStage = (key: ApplicantStageFilter) => {
    void store.setStageFilter(stageFilter.value === key ? 'all' : key)
  }

  // ─── Search (debounced, server side) ───
  const searchInput = ref(store.search)
  watchDebounced(searchInput, (value) => store.setSearch(value), { debounce: 300 })

  // ─── Shortlisted only (combines with the step and search) ───
  const toggleShortlistedOnly = () => store.setShortlistedOnly(!shortlistedOnly.value)

  const hasFilters = computed(
    () => searchInput.value.trim() !== '' || stageFilter.value !== 'all' || shortlistedOnly.value,
  )
  function clearFilters() {
    searchInput.value = ''
    shortlistedOnly.value = false
    store.setStageFilter('all')
  }

  // ─── Rows (same handler for the desktop button and the mobile swipe) ───
  const viewApplicant = (row: VacancyApplicantRow) =>
    router.push({ name: 'vacancy-applicant-review', params: { vacancyId: vacancyId.value, applicationId: row.id } })

  const toggleShortlist = (row: VacancyApplicantRow) => store.setShortlisted(row.id, !row.is_shortlisted)

  const getRowSwipeActions = (row: VacancyApplicantRow): SwipeAction[] => [
    { id: 'view', label: 'Review', icon: Eye, dismiss: false, onSelect: () => viewApplicant(row) },
    {
      id: 'shortlist',
      label: row.is_shortlisted ? 'Unlist' : 'Shortlist',
      icon: Star,
      onSelect: () => toggleShortlist(row),
    },
  ]

  /** Mobile card: name (★ when shortlisted), then stage · municipality · date applied */
  const getRowCard = (row: VacancyApplicantRow): SwipeCard => ({
    title: row.is_shortlisted ? `★ ${row.full_name}` : row.full_name,
    subtitle: [getJobApplicationStageLabel(row.stage, row.stage_name), row.municipality, `Applied ${formatGipDate(row.created_at)}`]
      .filter(Boolean)
      .join(' · '),
  })

  // ─── Table (DESIGN.md §13), paged on the server ───
  // No select / bulk delete column (DESIGN.md §13.1 rule 8): an application is the applicant's own record,
  // so employers never delete it — they move it to a stage, Not selected included.
  const columns: ColumnDef<VacancyApplicantRow>[] = [
    {
      id: 'applicant',
      header: 'Applicant',
      cell: ({ row }) =>
        h('div', { class: 'flex min-w-0 max-w-xs items-center gap-3' }, [
          h(Avatar, { class: 'size-8 shrink-0 border' }, () => [
            row.original.avatar_path
              ? h(AvatarImage, {
                  src: mediaService.getPublicUrl(row.original.avatar_path),
                  alt: row.original.full_name,
                  class: 'object-cover',
                })
              : null,
            h(AvatarFallback, { class: 'text-xs font-semibold' }, () => getInitials(row.original.full_name)),
          ]),
          h('div', { class: 'min-w-0' }, [
            h('p', { class: 'truncate text-sm font-medium' }, row.original.full_name),
            h('p', { class: 'truncate text-xs text-muted-foreground' }, row.original.municipality ?? '—'),
          ]),
        ]),
    },
    {
      id: 'course',
      header: 'Course',
      cell: ({ row }) =>
        h(
          'p',
          { class: ['max-w-56 truncate text-sm', row.original.course ? '' : 'text-muted-foreground'], title: row.original.course ?? undefined },
          row.original.course ?? '—',
        ),
    },
    {
      id: 'applied',
      header: 'Applied',
      cell: ({ row }) => h('div', { class: 'whitespace-nowrap text-sm' }, formatGipDate(row.original.created_at)),
    },
    {
      id: 'stage',
      header: 'Step',
      cell: ({ row }) =>
        h(Badge, { variant: 'outline', class: JOB_APPLICATION_STAGE_BADGE_CLASS[row.original.stage] }, () =>
          getJobApplicationStageLabel(row.original.stage, row.original.stage_name),
        ),
    },
    {
      id: 'actions',
      header: () => h('div', { class: 'text-right' }, 'Actions'),
      cell: ({ row }) =>
        h('div', { class: 'flex items-center justify-end gap-1' }, [
          h(
            Button,
            {
              variant: 'ghost',
              size: 'icon',
              class: 'size-8',
              disabled: shortlistBusyIds.value.has(row.original.id),
              'aria-pressed': row.original.is_shortlisted,
              'aria-label': `${row.original.is_shortlisted ? 'Remove' : 'Add'} ${row.original.full_name} ${row.original.is_shortlisted ? 'from' : 'to'} the shortlist`,
              title: row.original.is_shortlisted ? 'Remove from shortlist' : 'Add to shortlist',
              onClick: () => toggleShortlist(row.original),
            },
            () =>
              h(Star, {
                class: ['size-4', row.original.is_shortlisted ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'],
              }),
          ),
          h(
            Button,
            {
              variant: 'outline',
              size: 'sm',
              'aria-label': `Review ${row.original.full_name}`,
              onClick: () => viewApplicant(row.original),
            },
            () => [h(Eye, { class: 'size-4' }), 'Review'],
          ),
        ]),
    },
  ]

  const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))

  const table = useVueTable({
    get data() {
      return applicants.value
    },
    columns,
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    get pageCount() {
      return pageCount.value
    },
    state: {
      get pagination() {
        return { pageIndex: page.value, pageSize: pageSize.value }
      },
    },
  })

  const rangeLabel = computed(() => {
    if (total.value === 0) return '0 applicants'
    const from = page.value * pageSize.value + 1
    const to = Math.min(total.value, from + applicants.value.length - 1)
    return `${from}–${to} of ${total.value} applicant${total.value === 1 ? '' : 's'}`
  })
  const canPreviousPage = computed(() => page.value > 0)
  const canNextPage = computed(() => page.value + 1 < pageCount.value)
  const previousPage = () => store.setPage(page.value - 1)
  const nextPage = () => store.setPage(page.value + 1)

  // Load the applicants; another posting starts its search over, coming back from a review keeps it
  watch(
    vacancyId,
    (id) => {
      if (!id) return
      if (vacancy.value?.id !== id) searchInput.value = ''
      void store.openVacancy(id)
    },
    { immediate: true },
  )

  return {
    vacancyHeader,
    errorMessage,
    reload: () => store.openVacancy(vacancyId.value),
    // Stage chips & toolbar
    stageCards,
    selectStage,
    stageFilter,
    searchInput,
    hasFilters,
    clearFilters,
    shortlistedOnly,
    shortlistCount,
    toggleShortlistedOnly,
    // Table
    table,
    columns,
    applicants,
    isLoading,
    getRowCard,
    getRowSwipeActions,
    rangeLabel,
    pageCount,
    canPreviousPage,
    canNextPage,
    previousPage,
    nextPage,
  }
}
