import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute } from 'vue-router'
import { formatDisplayDate } from '@/helpers/common/dateFormatHelper'
import { useAuthStore } from '@/stores/common/auth'
import { useApplicantJobFairStore } from '@/stores/applicant/jobFairStore'
import {
  JOB_FAIR_PARTICIPANT_BADGE_CLASS,
  JOB_FAIR_STATUS_BADGE_CLASS,
  formatJobFairDateRange,
  formatOpenings,
  isJobFairOpen,
  toJobFairVacancyQualifications,
} from '@/helpers/common/jobFairEventHelper'
import {
  UNVERIFIED_APPLICANT_TITLE,
  toAccountRequirementsLink,
} from '@/helpers/applicant/accountVerificationHelper'

/** One job fair (applicant): details, pre-registration, and the confirmed companies with their vacancies */
export function useApplicantJobFairDetails() {
  const route = useRoute()
  const authStore = useAuthStore()
  const store = useApplicantJobFairStore()
  const { event, companies, isLoadingDetails, detailsError, isSubmitting, isCancelOpen } = storeToRefs(store)

  const jobFairId = computed(() => String(route.params.jobFairId ?? ''))

  const fair = computed(() => {
    const row = event.value
    if (!row) return null
    return {
      ...row,
      dateRange: formatJobFairDateRange(row.start_date, row.end_date),
      statusClass: JOB_FAIR_STATUS_BADGE_CLASS[row.status] ?? '',
      companies: `${row.company_count} compan${row.company_count === 1 ? 'y' : 'ies'}`,
      openings: formatOpenings(row.opening_count),
      postedOn: formatDisplayDate(row.created_at),
      /** The first picture PESO attached is the hero backdrop; all of them show under it */
      cover: row.image_urls[0] ?? null,
      photos: row.image_urls,
    }
  })

  // ─── Registration ───
  const registration = computed(() => event.value?.my_registration_status ?? null)
  const registrationClass = computed(() => (registration.value ? JOB_FAIR_PARTICIPANT_BADGE_CLASS[registration.value] ?? '' : ''))
  const isOpen = computed(() => !!event.value && isJobFairOpen(event.value.status))
  const isVerified = computed(() => authStore.isVerified)
  const canRegister = computed(() => isOpen.value && !registration.value && isVerified.value)
  const canCancel = computed(() => isOpen.value && registration.value === 'Registered')
  const showVerifyAlert = computed(() => isOpen.value && !registration.value && !isVerified.value)
  const verifyTitle = UNVERIFIED_APPLICANT_TITLE
  const verifyLink = computed(() => toAccountRequirementsLink(authStore.username))

  const register = () => {
    if (canRegister.value) void store.register(jobFairId.value)
  }
  const openCancel = () => {
    isCancelOpen.value = true
  }
  const confirmCancel = () => store.cancelRegistration(jobFairId.value)

  // ─── Companies (bounded: one fair's participants; filtered in the browser) ───
  const companySearch = ref('')
  const hasCompanySearch = computed(() => companySearch.value.trim() !== '')
  const clearCompanySearch = () => {
    companySearch.value = ''
  }

  const companyCards = computed(() => {
    const term = companySearch.value.trim().toLowerCase()
    return companies.value
      .filter((company) => {
        if (!term) return true
        const haystack = [company.business_name, company.trade_name, company.industry_line, ...company.vacancies.map((v) => v.position_title)]
        return haystack.some((value) => value?.toLowerCase().includes(term))
      })
      .map((company) => {
        const location = [company.city_municipality, company.province].filter(Boolean).join(', ')
        const summary = `${company.vacancy_count} vacanc${company.vacancy_count === 1 ? 'y' : 'ies'} · ${formatOpenings(company.opening_count)}`
        return {
        id: company.participant_id,
        name: company.business_name,
        subtitle: [company.industry_line, location].filter(Boolean).join(' · ') || summary,
        summary,
        vacancies: company.vacancies.map((vacancy) => ({
          id: vacancy.id,
          title: vacancy.position_title,
          natureOfWork: vacancy.nature_of_work,
          salary: vacancy.salary?.trim() || 'Not stated',
          location: vacancy.place_of_work?.trim() || 'Not stated',
          openings: vacancy.opening_count == null ? 'No set limit' : formatOpenings(vacancy.opening_count),
          acceptsPwd: vacancy.accepts_pwd,
          ...toJobFairVacancyQualifications(vacancy),
        })),
        }
      })
  })

  const reload = () => store.fetchDetails(jobFairId.value)

  watch(jobFairId, (id) => {
    if (id) void store.fetchDetails(id)
  }, { immediate: true })

  return {
    fair,
    isLoadingDetails,
    detailsError,
    reload,
    registration,
    registrationClass,
    isOpen,
    canRegister,
    canCancel,
    showVerifyAlert,
    verifyTitle,
    verifyLink,
    isSubmitting,
    register,
    isCancelOpen,
    openCancel,
    confirmCancel,
    companySearch,
    hasCompanySearch,
    clearCompanySearch,
    companyCards,
  }
}
