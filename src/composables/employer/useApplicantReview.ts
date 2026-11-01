import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { useJobApplicantStore } from '@/stores/employer/jobApplicantStore'
import { useStatusRemarks } from '@/composables/common/useStatusRemarks'
import { mediaService } from '@/services/common/mediaService'
import { describeGipApplicant, formatGipDate } from '@/helpers/applicant/gipApplicationHelper'
import { getInitials } from '@/helpers/peso/provincialPeso/gipHelper'
import {
  JOB_APPLICATION_STAGE_BADGE_CLASS,
  getJobApplicationStageLabel,
  jobApplicationCode,
  toJobApplicationRequirements,
} from '@/helpers/common/jobVacancyApplicationHelper'
import { toApplicantMoveOptions } from '@/helpers/employer/jobApplicantHelper'
import {
  FIT_BAND_BADGE_CLASS,
  FIT_BAND_LABEL,
  FIT_DISCLAIMER,
  FIT_METHOD,
  formatFitCounts,
  toFitCriterionViews,
} from '@/helpers/common/jobVacancyFitHelper'
import type { ApplicantStageFilter, VacancyApplicationDetails } from '@/types/employer/jobApplicant'

/**
 * Where an application sits, as the "Move to" dropdown names it: 'rejected' or the step id. An application
 * from before migration 091 without a step reads as the first step (Paper Screening).
 */
const currentTarget = (
  application: Pick<VacancyApplicationDetails, 'stage' | 'stage_id'>,
  firstStepId: string | null,
): ApplicantStageFilter =>
  application.stage === 'rejected' ? 'rejected' : (application.stage_id ?? firstStepId ?? 'applied')

/**
 * Review page of one application: the applicant's summary and files, and the form that moves them to
 * another hiring step. Opening it is logged in the database (PRIVACY.md §5.2).
 */
export function useApplicantReview() {
  const route = useRoute()
  const router = useRouter()
  const store = useJobApplicantStore()
  const {
    vacancy,
    applicants,
    selectedApplication,
    documents,
    isLoadingDetail,
    detailError,
    isSavingStage,
    isSelectedShortlisted,
    shortlistBusyIds,
    selectedFit,
    isLoadingFit,
  } = storeToRefs(store)

  const vacancyId = computed(() => String(route.params.vacancyId ?? ''))
  const applicationId = computed(() => String(route.params.applicationId ?? ''))
  const applicantsRoute = computed(() => ({ name: 'vacancy-applicants', params: { vacancyId: vacancyId.value } }))

  const steps = computed(() => [...(vacancy.value?.stages ?? [])].sort((a, b) => a.sort_order - b.sort_order))
  const firstStepId = computed(() => steps.value[0]?.id ?? null)

  // ─── Applicant summary ───
  const review = computed(() => {
    const application = selectedApplication.value
    if (!application) return null
    const applicant = application.applicant
    const name = [applicant.first_name, applicant.middle_name, applicant.surname, applicant.suffix].filter(Boolean).join(' ')
    // The application carries the profile picture (migration 101), so a reload keeps it; the list row is the fallback
    const avatarPath =
      application.avatar_path ?? applicants.value.find((row) => row.id === application.id)?.avatar_path ?? null
    const stepName = steps.value.find((step) => step.id === application.stage_id)?.stage_name ?? null
    return {
      name,
      initials: getInitials(name),
      avatarUrl: avatarPath ? mediaService.getPublicUrl(avatarPath) : null,
      reference: jobApplicationCode(application.id, application.created_at),
      appliedOn: formatGipDate(application.created_at),
      position: vacancy.value?.position_title ?? '',
      stageLabel: getJobApplicationStageLabel(application.stage, stepName),
      stageClass: JOB_APPLICATION_STAGE_BADGE_CLASS[application.stage],
      details: describeGipApplicant(applicant),
      documents: toJobApplicationRequirements(vacancy.value?.requirements ?? [], documents.value).map(({ name, isOptional }) => {
        const file = documents.value[name]
        return { name, isOptional, fileName: file?.file_name ?? null, url: file?.url ?? null }
      }),
    }
  })

  // ─── Requirements fit (migration 098): advisory, from the NSRP profile ───
  const fit = computed(() => {
    const value = selectedFit.value
    if (!value) return null
    return {
      hasCriteria: value.criteria.length > 0,
      bandLabel: value.band ? FIT_BAND_LABEL[value.band] : null,
      bandClass: value.band ? FIT_BAND_BADGE_CLASS[value.band] : '',
      score: value.score,
      counts: value.required_count > 0 ? formatFitCounts(value) : null,
      criteria: toFitCriterionViews(value),
    }
  })

  // ─── Hiring step form ───
  /** A hiring step id or 'rejected'; Not selected needs remarks */
  const stage = ref<ApplicantStageFilter>('applied')
  const stageOptions = computed(() => toApplicantMoveOptions(steps.value))
  const stageModel = computed({
    get: () => stage.value,
    set: (value: unknown) => {
      if (typeof value === 'string' && stageOptions.value.some((option) => option.value === value)) stage.value = value
    },
  })
  const { remarks, remarksError, isRemarksRequired, remarksToSave, validateRemarks, resetRemarks } =
    useStatusRemarks(stage)

  // The loaded application's step and remarks fill the form
  watch(
    selectedApplication,
    (application) => {
      if (!application) return
      stage.value = currentTarget(application, firstStepId.value)
      resetRemarks(application.status_remarks)
    },
    { immediate: true },
  )

  const hasStageChange = computed(
    () =>
      !!selectedApplication.value &&
      (stage.value !== currentTarget(selectedApplication.value, firstStepId.value) ||
        (stage.value === 'rejected' && remarksToSave.value !== (selectedApplication.value.status_remarks ?? null))),
  )

  /** Moves the applicant, then goes back to the list (which reloads its counts) */
  async function saveStage() {
    if (!hasStageChange.value || !validateRemarks()) return
    const label = String(stageOptions.value.find((option) => option.value === stage.value)?.label ?? 'the new step')
    if (await store.updateStage(stage.value, label.replace(/^\d+\. /, ''), remarksToSave.value)) {
      await router.push(applicantsRoute.value)
    }
  }

  // ─── Shortlist (private to the company; the applicant isn't told) ───
  const isShortlistBusy = computed(() => shortlistBusyIds.value.has(applicationId.value))
  const toggleShortlist = () => store.setShortlisted(applicationId.value, !isSelectedShortlisted.value)

  const reload = () => store.openApplication(vacancyId.value, applicationId.value)

  watch(
    [vacancyId, applicationId],
    ([vacancy, application]) => {
      if (vacancy && application) void store.openApplication(vacancy, application)
    },
    { immediate: true },
  )

  // Don't keep the applicant's details and files in memory once the page is left
  onBeforeUnmount(() => store.closeApplication())

  return {
    applicantsRoute,
    review,
    isLoading: isLoadingDetail,
    errorMessage: detailError,
    reload,
    // Shortlist
    isShortlisted: isSelectedShortlisted,
    isShortlistBusy,
    toggleShortlist,
    // Requirements fit
    fit,
    isLoadingFit,
    fitDisclaimer: FIT_DISCLAIMER,
    fitMethod: FIT_METHOD,
    // Hiring step form
    stage: stageModel,
    stageOptions,
    remarks,
    remarksError,
    isRemarksRequired,
    hasStageChange,
    isSavingStage,
    saveStage,
  }
}
