import { computed, readonly, ref } from 'vue'
import { breakpointsTailwind, useBreakpoints, useColorMode, useTimeoutFn } from '@vueuse/core'
import { resolveTokenHex } from '@/helpers/common/colorTokenHelper'

const INTRO_TEXT = 'Province of Agusan del Sur'
// StrokeText timing (seconds). `delay` starts the draw as the seal lands
const INTRO_TEXT_TIMING = { delay: 0.5, drawDuration: 1, stagger: 0.03, fillDelay: 0.1 } as const
// Mirrors StrokeText's fill length: max(0.5, drawDuration * 0.5)
const INTRO_TEXT_FILL = Math.max(0.5, INTRO_TEXT_TIMING.drawDuration * 0.5)
// The pixel background swap runs at PixelSwap's own 1.4s pace, timed so its last pixel
// lands as the text fill finishes (~2.1s)
const INTRO_TEXT_FILL_END_MS =
  (INTRO_TEXT_TIMING.delay + INTRO_TEXT_TIMING.drawDuration + INTRO_TEXT_TIMING.fillDelay + INTRO_TEXT_FILL) * 1000
const INTRO_SWAP_DURATION_MS = 1400
const INTRO_SWAP_DELAY_MS = Math.max(0, INTRO_TEXT_FILL_END_MS - INTRO_SWAP_DURATION_MS)
const INTRO_DURATION_MS = 3200

// Module-level so the intro plays once per page load, not on every in-app return to the landing page
let hasPlayed = false
// Shared with the rest of the landing page, so entrance animations wait until the intro stops covering it
const isIntroDone = ref(false)

/** True once the landing intro has started fading out (or was skipped), so the page underneath is visible. */
export function useLandingIntroDone() {
  return readonly(isIntroDone)
}

/** Full-screen seal + "Province of Agusan del Sur" intro, shown for 3.2s on the first load of the landing page. */
export function useLandingIntro() {
  const prefersReducedMotion =
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  const isIntroVisible = ref(!hasPlayed && !prefersReducedMotion)
  hasPlayed = true
  if (!isIntroVisible.value) isIntroDone.value = true

  useTimeoutFn(() => {
    isIntroVisible.value = false
    isIntroDone.value = true
  }, INTRO_DURATION_MS, { immediate: isIntroVisible.value })

  const isBackgroundSwapped = ref(false)
  useTimeoutFn(() => {
    isBackgroundSwapped.value = true
  }, INTRO_SWAP_DELAY_MS, { immediate: isIntroVisible.value })

  // The intro opens on the inverted background, so the electric strands start inverted too and
  // flip to the page's colors halfway through the swap (ElectricLogo eases the change over ~0.35s)
  const isElectricSettled = ref(false)
  useTimeoutFn(() => {
    isElectricSettled.value = true
  }, INTRO_SWAP_DELAY_MS + INTRO_SWAP_DURATION_MS / 2, { immediate: isIntroVisible.value })

  // StrokeText renders at a fixed pixel size, so the size steps with the Tailwind breakpoints.
  // Each step keeps the full one-line phrase inside the container (it also scales down to fit if it doesn't)
  const breakpoints = useBreakpoints(breakpointsTailwind)
  const fontSize = computed(() => {
    if (breakpoints.greaterOrEqual('lg').value) return 60
    if (breakpoints.greaterOrEqual('sm').value) return 40
    return 22
  })
  const letterSpacing = computed(() => -Math.round(fontSize.value / 40))

  // Monochrome strands that contrast whatever background is behind the seal. ElectricLogo's 'dark' theme
  // glows light-on-dark and its 'light' theme draws ink on light, so the theme follows the background too
  const mode = useColorMode()
  const isDark = computed(() => mode.value === 'dark')
  const electric = computed(() => {
    // Before the flip the background is --foreground (dark in light mode), so the strands use --background
    const onDarkBackground = isElectricSettled.value ? isDark.value : !isDark.value
    const color = resolveTokenHex(isElectricSettled.value ? '--foreground' : '--background')
    return { color, glowColor: color, theme: onDarkBackground ? ('dark' as const) : ('light' as const) }
  })

  return {
    introText: INTRO_TEXT,
    introTextTiming: INTRO_TEXT_TIMING,
    swapDurationMs: INTRO_SWAP_DURATION_MS,
    isIntroVisible,
    isBackgroundSwapped,
    fontSize,
    letterSpacing,
    electric,
  }
}
