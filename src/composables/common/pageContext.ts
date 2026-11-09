import { isReactive, isRef, markRaw, reactive, type UnwrapNestedRefs } from 'vue'

/**
 * Wraps a page's composable state for provide(): refs and computeds stay live (sections read and
 * v-model them through toRefs), while plain constants (schemas, option lists, config maps) are passed
 * through untouched, exactly as the page itself sees them, instead of being deep-proxied.
 */
export function toPageContext<T extends object>(state: T): UnwrapNestedRefs<T> {
  const entries = Object.entries(state).map(([key, value]) => [
    key,
    value !== null && typeof value === 'object' && !isRef(value) && !isReactive(value) ? markRaw(value) : value,
  ])
  return reactive(Object.fromEntries(entries)) as UnwrapNestedRefs<T>
}
