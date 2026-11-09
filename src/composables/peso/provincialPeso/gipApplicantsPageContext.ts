import { inject, provide, toRefs, type InjectionKey, type UnwrapNestedRefs } from 'vue'
import { toPageContext } from '@/composables/common/pageContext'
import type { useGipApplicantsPage } from '@/composables/peso/provincialPeso/useGipApplicantsPage'

/**
 * GipApplicants.vue's state, shared with its section components (ESMDD/GIP/GipApplicants/*.vue) so
 * the registry table and every dialog work on the same data. The page creates it once and provides it.
 */
type GipApplicantsPageState = ReturnType<typeof useGipApplicantsPage>

const GIP_APPLICANTS_PAGE_KEY: InjectionKey<UnwrapNestedRefs<GipApplicantsPageState>> = Symbol('gipApplicantsPage')

export function provideGipApplicantsPage(state: GipApplicantsPageState) {
  provide(GIP_APPLICANTS_PAGE_KEY, toPageContext(state))
}

/** The page's state as refs, so section templates read and v-model them like the page does */
export function useGipApplicantsPageContext() {
  const state = inject(GIP_APPLICANTS_PAGE_KEY)
  if (!state) throw new Error('GIP Applicants section used outside GipApplicants.vue')
  return toRefs(state)
}
