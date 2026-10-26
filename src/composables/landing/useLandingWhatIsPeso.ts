import { computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useSiteContentStore } from '@/stores/common/siteContentStore'
import { ORG_EMPLOYMENT_STATUS_LABELS, type OrgChartStatus } from '@/types/common/siteContent'

export interface LandingPesoService {
  name: string
  description: string
}

export interface LandingPesoStatusStyle {
  label: string
  /** Card border in the status color (also the legend's swatch) */
  border: string
}

export interface LandingPesoLaw {
  code: string
  title: string
}

// PESO's legal basis: created by the PESO Act of 1999, made permanent in every LGU by its 2015 amendment
const LAWS: LandingPesoLaw[] = [
  { code: 'RA 8759', title: 'PESO Act of 1999' },
  { code: 'RA 10691', title: 'Amended PESO Act, 2015' },
]

// The core PESO services under RA 8759, in the order an applicant usually meets them
const SERVICES: LandingPesoService[] = [
  {
    name: 'Job matching and referral',
    description: 'Applicants are matched to local and overseas vacancies and referred to employers for interviews.',
  },
  {
    name: 'Career guidance',
    description: 'Employment coaching and career counseling for students, first-time job seekers, and career shifters.',
  },
  {
    name: 'Labor market information',
    description: 'Up-to-date listings of in-demand jobs and skills, so job seekers and schools know what employers need.',
  },
  {
    name: 'Skills training referral',
    description: 'Referrals to TESDA and partner institutions for training that leads to employment or livelihood.',
  },
  {
    name: 'Job fairs',
    description: 'Local and special recruitment activities that bring employers and applicants together in one place.',
  },
  {
    name: 'Employment programs',
    description: 'Implementation of DOLE programs such as SPES, GIP, and TUPAD for students, graduates, and displaced workers.',
  },
]

// Legend colors are tokens in style.css (--org-*), following the office's own staffing pattern chart
const STATUS_STYLES: Record<OrgChartStatus, LandingPesoStatusStyle> = {
  elected: { label: ORG_EMPLOYMENT_STATUS_LABELS.elected, border: 'border-org-elected' },
  permanent: { label: ORG_EMPLOYMENT_STATUS_LABELS.permanent, border: 'border-org-permanent' },
  casual: { label: ORG_EMPLOYMENT_STATUS_LABELS.casual, border: 'border-org-casual' },
  job_order: { label: ORG_EMPLOYMENT_STATUS_LABELS.job_order, border: 'border-org-job-order' },
  vacant: { label: 'Vacant', border: 'border-dashed border-muted-foreground/60' },
}

const LEGEND = Object.values(STATUS_STYLES)

/** "What is PESO?" page (/what-is-peso), under its banner: a definition and legal basis on the left, the office's services listed on the right,
 * then the organizational structure and staffing pattern below. */
export function useLandingWhatIsPeso() {
  // The chart is managed by Provincial PESO in Site Contents → Organizational chart (migration 052)
  const store = useSiteContentStore()
  const { orgChart, isOrgChartLoading, achievements, isAchievementsLoading } = storeToRefs(store)

  // PESO's achievements under the chart, managed in Site Contents → Achievements (migration 059). Tiles keep
  // each photo's aspect ratio from its stored size; photos without one get a square tile. A click opens the
  // full photo; the title shows on hover.
  const achievementItems = computed(() =>
    achievements.value.map(achievement => ({
      id: achievement.id,
      img: achievement.image_url,
      url: achievement.image_url,
      width: achievement.width ?? 1,
      height: achievement.height ?? 1,
      label: achievement.title ?? undefined,
    })),
  )

  onMounted(() => {
    void store.loadOrgChart()
    void store.loadAchievements()
  })

  return {
    title: 'Public Employment Service Office',
    definition:
      'The Public Employment Service Office is a non-fee charging, multi-employment service facility run by local government units in coordination with the Department of Labor and Employment.',
    purpose:
      'It is the first stop for anyone looking for work, and for employers looking for workers, in the province.',
    laws: LAWS,
    services: SERVICES,
    chartTitle: 'Provincial Public Employment Service Office',
    chartDescription: 'Organizational Structure and Staffing Pattern.',
    orgChart,
    isOrgChartLoading,
    legend: LEGEND,
    statusStyles: STATUS_STYLES,
    achievementsTitle: 'Achievements',
    achievementsDescription: 'Awards, recognitions and milestones of the Provincial Public Employment Service Office.',
    achievementItems,
    isAchievementsLoading,
  }
}
