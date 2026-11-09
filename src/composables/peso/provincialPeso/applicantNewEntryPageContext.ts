import { inject, provide, toRefs, type InjectionKey, type UnwrapNestedRefs } from 'vue'
import { toPageContext } from '@/composables/common/pageContext'
import type { useApplicantNewEntryPage } from '@/composables/peso/provincialPeso/useApplicantNewEntryPage'

/**
 * ApplicantNewEntry.vue's state, shared with its step components (Common/NewEntry/*.vue) so
 * every step fills the same NSRP form. The page creates it once and provides it.
 */
type ApplicantNewEntryPageState = ReturnType<typeof useApplicantNewEntryPage>

const APPLICANT_NEW_ENTRY_PAGE_KEY: InjectionKey<UnwrapNestedRefs<ApplicantNewEntryPageState>> = Symbol('applicantNewEntryPage')

export function provideApplicantNewEntryPage(state: ApplicantNewEntryPageState) {
  provide(APPLICANT_NEW_ENTRY_PAGE_KEY, toPageContext(state))
}

/** The page's state as refs, so section templates read and v-model them like the page does */
export function useApplicantNewEntryPageContext() {
  const state = inject(APPLICANT_NEW_ENTRY_PAGE_KEY)
  if (!state) throw new Error('New entry step used outside ApplicantNewEntry.vue')
  return toRefs(state)
}
