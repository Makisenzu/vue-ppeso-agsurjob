import { reactive, ref, toValue, watch, type MaybeRefOrGetter } from 'vue'
import { mediaService } from '@/services/common/mediaService'

/**
 * The profile picture of an account (latest core.profile_media row), for showing someone else's
 * avatar — e.g. PESO viewing an applicant. PESO reads every profile picture (peso_select, migration
 * 034). Null without an account, a picture, or when it can't be loaded: the avatar shows initials.
 */
export function useProfileAvatar(profileId: MaybeRefOrGetter<string | null | undefined>) {
  const avatarUrl = ref<string | null>(null)

  watch(
    () => toValue(profileId),
    async (id) => {
      avatarUrl.value = null
      if (!id) return
      try {
        const [latest] = await mediaService.fetchMediaByProfileId(id)
        // Ignore a late answer for an applicant no longer shown
        if (!latest || toValue(profileId) !== id) return
        const source = latest as typeof latest & { public_url?: string | null }
        avatarUrl.value = source.public_url || (latest.path ? mediaService.getPublicUrl(latest.path) : null)
      } catch (error) {
        console.warn('[useProfileAvatar] Could not load the profile picture:', error)
      }
    },
    { immediate: true }
  )

  return { avatarUrl }
}

/**
 * Profile pictures for a list (e.g. the rows of a table page), loaded in one query for the accounts
 * not fetched yet. `avatarUrlFor(profileId)` is null until loaded or without a picture: initials show.
 */
export function useProfileAvatars(profileIds: MaybeRefOrGetter<(string | null | undefined)[]>) {
  const urls = reactive(new Map<string, string | null>())

  watch(
    () => toValue(profileIds),
    async (ids) => {
      const missing = [...new Set(ids.filter((id): id is string => !!id && !urls.has(id)))]
      if (!missing.length) return
      // Mark them as asked so a page shown again doesn't fetch twice
      for (const id of missing) urls.set(id, null)
      try {
        const found = await mediaService.fetchAvatarUrls(missing)
        for (const [id, url] of found) urls.set(id, url)
      } catch (error) {
        for (const id of missing) urls.delete(id)
        console.warn('[useProfileAvatars] Could not load the profile pictures:', error)
      }
    },
    { immediate: true }
  )

  const avatarUrlFor = (profileId: string | null | undefined) => (profileId ? (urls.get(profileId) ?? null) : null)

  return { avatarUrlFor }
}
