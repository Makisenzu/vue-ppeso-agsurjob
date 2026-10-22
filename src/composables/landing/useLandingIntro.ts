import { computed, ref } from 'vue'
import { breakpointsTailwind, useBreakpoints, useTimeoutFn } from '@vueuse/core'

// Two lines, "Agusan del Sur" at the bottom
const INTRO_LINES = ['Province of', 'Agusan del Sur'] as const
const INTRO_DURATION_MS = 3000

// Module-level so the intro plays once per page load, not on every in-app return to the landing page
let hasPlayed = false

/** Full-screen "Province of Agusan del Sur" intro, shown for 3s on the first load of the landing page. */
export function useLandingIntro() {
  const prefersReducedMotion =
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  const isIntroVisible = ref(!hasPlayed && !prefersReducedMotion)
  hasPlayed = true

  useTimeoutFn(() => {
    isIntroVisible.value = false
  }, INTRO_DURATION_MS, { immediate: isIntroVisible.value })

  // StrokeText renders at a fixed pixel size, so the size steps with the Tailwind breakpoints.
  // Each step keeps "Agusan del Sur" inside the container, so both lines render at the same size
  const breakpoints = useBreakpoints(breakpointsTailwind)
  const fontSize = computed(() => {
    if (breakpoints.greaterOrEqual('lg').value) return 112
    if (breakpoints.greaterOrEqual('sm').value) return 72
    return 40
  })
  const letterSpacing = computed(() => -Math.round(fontSize.value / 40))

  return {
    introLines: INTRO_LINES,
    isIntroVisible,
    fontSize,
    letterSpacing,
  }
}
