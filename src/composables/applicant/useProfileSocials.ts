import { computed, ref, watch, type MaybeRefOrGetter, toValue } from 'vue'
import { storeToRefs } from 'pinia'
import { useProfileSocialStore, type ProfileSocialDraft } from '@/stores/applicant/profileSocialStore'
import {
  MAX_PROFILE_SOCIALS,
  SOCIAL_PLATFORMS,
  detectSocialPlatform,
  formatSocialHandle,
  normalizeSocialLink,
  parseSocialLink,
} from '@/helpers/applicant/profileSocialHelper'

export function useProfileSocials(profileId: MaybeRefOrGetter<string | null | undefined>) {
  const store = useProfileSocialStore()
  const { socials, loadedProfileId, isLoading, isSaving, isEditorOpen } = storeToRefs(store)
  const { fetchSocials, saveSocials } = store

  const platformOptions = SOCIAL_PLATFORMS.map((p) => p.name)

  /** Links ready to render; the store may still hold another profile's links while loading. */
  const displaySocials = computed(() =>
    loadedProfileId.value === toValue(profileId)
      ? socials.value
          .filter((s) => s.social_link)
          .map((s) => ({
            id: s.id,
            name: s.social_name || detectSocialPlatform(s.social_link!) || 'Website',
            handle: formatSocialHandle(s.social_link),
            href: normalizeSocialLink(s.social_link!),
          }))
      : []
  )

  // ─── Editor ───
  const drafts = ref<ProfileSocialDraft[]>([])
  const showErrors = ref(false)

  const draftErrors = computed(() =>
    drafts.value.map((d) => {
      if (!d.social_link.trim()) return 'Enter a link.'
      if (!parseSocialLink(d.social_link)) return 'Enter a valid link, like facebook.com/yourname.'
      return ''
    })
  )
  const canAddDraft = computed(() => drafts.value.length < MAX_PROFILE_SOCIALS)

  function resetDrafts() {
    drafts.value = socials.value.map((s) => ({
      id: s.id,
      social_name: s.social_name || detectSocialPlatform(s.social_link ?? '') || 'Website',
      social_link: s.social_link ?? '',
    }))
    if (drafts.value.length === 0) addDraft()
    showErrors.value = false
  }

  function addDraft() {
    if (!canAddDraft.value) return
    drafts.value.push({ social_name: platformOptions[0], social_link: '' })
  }

  function removeDraft(index: number) {
    drafts.value.splice(index, 1)
  }

  /** Picks the platform from a pasted link so the user rarely has to touch the select. */
  function onDraftLinkInput(index: number, link: string) {
    const detected = detectSocialPlatform(link)
    if (detected) drafts.value[index].social_name = detected
  }

  async function submitDrafts() {
    const id = toValue(profileId)
    if (!id) return
    showErrors.value = true
    if (draftErrors.value.some(Boolean)) return
    await saveSocials(id, drafts.value)
  }

  watch(isEditorOpen, (open) => {
    if (open) resetDrafts()
  })

  watch(
    () => toValue(profileId),
    (id) => {
      if (id && id !== loadedProfileId.value) fetchSocials(id)
    },
    { immediate: true }
  )

  return {
    displaySocials,
    isLoading,
    isSaving,
    isEditorOpen,
    platformOptions,
    drafts,
    draftErrors,
    showErrors,
    canAddDraft,
    addDraft,
    removeDraft,
    onDraftLinkInput,
    submitDrafts,
  }
}
