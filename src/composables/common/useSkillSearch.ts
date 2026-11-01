import { computed, ref, watch, type Ref } from 'vue'
import { watchDebounced } from '@vueuse/core'
import { skillCatalogService } from '@/services/common/skillCatalogService'
import { cleanSkillInput, toSkillKey } from '@/helpers/common/skillHelper'
import type { SkillSuggestion } from '@/types/common/skillCatalog'

const MIN_QUERY_LENGTH = 2
const SEARCH_DEBOUNCE_MS = 200

/** Results per query for this visit; the list changes rarely */
const searchCache = new Map<string, SkillSuggestion[]>()
/** key → whether the list knows that wording */
const knownCache = new Map<string, boolean>()

/**
 * Suggestions from the shared skill list (migration 099) for what's being typed. Skills already picked
 * (`takenKeys`) are left out. A failed search just shows no suggestions; typing a skill still works.
 */
export function useSkillSearch(query: Ref<string>, takenKeys: Ref<Set<string>>) {
  const results = ref<SkillSuggestion[]>([])
  const isSearching = ref(false)
  let requestId = 0

  const normalizedQuery = computed(() => toSkillKey(query.value))

  async function runSearch(key: string) {
    if (key.length < MIN_QUERY_LENGTH) {
      results.value = []
      return
    }
    const cached = searchCache.get(key)
    if (cached) {
      results.value = cached
      return
    }
    const current = ++requestId
    isSearching.value = true
    try {
      const rows = await skillCatalogService.search(key)
      searchCache.set(key, rows)
      for (const row of rows) knownCache.set(toSkillKey(row.name), true)
      if (current === requestId) results.value = rows
    } catch {
      if (current === requestId) results.value = []
    } finally {
      if (current === requestId) isSearching.value = false
    }
  }

  watchDebounced(normalizedQuery, (key) => void runSearch(key), { debounce: SEARCH_DEBOUNCE_MS })
  // Clearing the box hides the old suggestions at once
  watch(normalizedQuery, (key) => {
    if (key.length < MIN_QUERY_LENGTH) results.value = []
  })

  const suggestions = computed(() => results.value.filter((row) => !takenKeys.value.has(toSkillKey(row.name))))

  /** What's typed, when it isn't exactly one of the suggestions (offered as "Add … as typed") */
  const typedOption = computed(() => {
    const name = cleanSkillInput(query.value)
    if (name.length < MIN_QUERY_LENGTH || takenKeys.value.has(toSkillKey(name))) return null
    return results.value.some((row) => toSkillKey(row.name) === toSkillKey(name)) ? null : name
  })

  return { suggestions, typedOption, isSearching }
}

/**
 * Which of the given names the skill list doesn't know yet (shown as "Not on the skill list yet").
 * Checked in one call, debounced; unknown until answered, so nothing is flagged by mistake.
 */
export function useUnknownSkillNames(names: Ref<readonly string[]>) {
  const unknownKeys = ref<Set<string>>(new Set())
  let requestId = 0

  async function check(list: readonly string[]) {
    const pending = list.filter((name) => !knownCache.has(toSkillKey(name)))
    if (pending.length) {
      const current = ++requestId
      try {
        const resolved = await skillCatalogService.resolveNames([...pending])
        for (const row of resolved) knownCache.set(toSkillKey(row.name), row.skill_id != null)
      } catch {
        return
      }
      if (current !== requestId) return
    }
    unknownKeys.value = new Set(list.map(toSkillKey).filter((key) => knownCache.get(key) === false))
  }

  watchDebounced(names, (list) => void check(list), { debounce: SEARCH_DEBOUNCE_MS, immediate: true, deep: true })

  const isUnknown = (name: string) => unknownKeys.value.has(toSkillKey(name))
  return { isUnknown }
}
