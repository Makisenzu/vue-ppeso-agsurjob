import { inject, provide, toRefs, type InjectionKey, type UnwrapNestedRefs } from 'vue'
import { toPageContext } from '@/composables/common/pageContext'
import type { useApplicantNsrpDetails } from '@/composables/peso/provincialPeso/useApplicantNsrpDetails'

/**
 * ApplicantNsrpDetails.vue's state, shared with its section components (Common/NsrpDetails/*.vue) so
 * every section edits the same record. The page calls useApplicantNsrpDetails once and provides it.
 */
type ApplicantNsrpDetailsState = ReturnType<typeof useApplicantNsrpDetails>

const APPLICANT_NSRP_DETAILS_KEY: InjectionKey<UnwrapNestedRefs<ApplicantNsrpDetailsState>> = Symbol('applicantNsrpDetails')

export function provideApplicantNsrpDetails(state: ApplicantNsrpDetailsState) {
  provide(APPLICANT_NSRP_DETAILS_KEY, toPageContext(state))
}

/** The page's state as refs, so section templates read and v-model them like the page does */
export function useApplicantNsrpDetailsContext() {
  const state = inject(APPLICANT_NSRP_DETAILS_KEY)
  if (!state) throw new Error('NSRP section used outside ApplicantNsrpDetails.vue')
  return toRefs(state)
}
