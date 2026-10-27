import { computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/common/auth'
import { useSpesFormStore } from '@/stores/applicant/spesFormStore'
import { useSpesFormSteps } from '@/composables/common/useSpesFormSteps'
import { buildSpesFormPayload, toSpesFormValues } from '@/helpers/common/spesFormHelper'

/**
 * "My SPES details": the applicant's saved SPES form, used by every SPES application they make.
 * They can edit it at any time, even after PESO has reviewed an application (guard, migration 067);
 * the documents belong to each application instead (useSpesApplicationForm). Without saved details
 * yet, the first application fills them in, so this page sends them there.
 */
export function useSpesFormEntry() {
  const router = useRouter()
  const authStore = useAuthStore()
  const { user } = storeToRefs(authStore)
  const store = useSpesFormStore()
  const { myForm, isLoading, isSubmitting, errorMessage } = storeToRefs(store)

  const form = useSpesFormSteps({ withRequirements: false })
  const profileId = computed(() => user.value?.id ?? null)
  const backLink = { name: 'spes-application-form' } as const

  const load = async () => {
    if (!profileId.value) return
    await store.fetchMyForm(profileId.value)
    if (myForm.value) form.loadValues(toSpesFormValues(myForm.value))
    else if (!errorMessage.value) await router.replace(backLink)
  }

  watch(profileId, () => void load(), { immediate: true })

  const saveDetails = form.createSubmitHandler(async (values) => {
    if (await store.saveDetails(buildSpesFormPayload(values))) await router.push(backLink)
  })

  return {
    form,
    backLink,
    isLoading,
    isSubmitting,
    errorMessage,
    reload: load,
    saveDetails,
  }
}
