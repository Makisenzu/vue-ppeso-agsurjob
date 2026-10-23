import { computed, ref } from 'vue'
import { breakpointsTailwind, useBreakpoints, useColorMode, useTimeoutFn } from '@vueuse/core'

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

/** Resolves a CSS color token (e.g. `--primary`, defined in oklch) to hex, since ElectricLogo's WebGL colors only take hex. */
function resolveTokenHex(token: string): string {
  const probe = document.createElement('span')
  probe.style.color = `var(${token})`
  document.body.appendChild(probe)
  const color = getComputedStyle(probe).color
  probe.remove()

  // Paint one pixel so the browser converts any color space to sRGB bytes
  const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true })
  if (!ctx) return '#ffffff'
  ctx.fillStyle = color
  ctx.fillRect(0, 0, 1, 1)
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`
}

// Module-level so the intro plays once per page load, not on every in-app return to the landing page
let hasPlayed = false

/** Full-screen seal + "Province of Agusan del Sur" intro, shown for 3.2s on the first load of the landing page. */
export function useLandingIntro() {
  const prefersReducedMotion =
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  const isIntroVisible = ref(!hasPlayed && !prefersReducedMotion)
  hasPlayed = true

  useTimeoutFn(() => {
    isIntroVisible.value = false
  }, INTRO_DURATION_MS, { immediate: isIntroVisible.value })

  const isBackgroundSwapped = ref(false)
  useTimeoutFn(() => {
    isBackgroundSwapped.value = true
  }, INTRO_SWAP_DELAY_MS, { immediate: isIntroVisible.value })

  // StrokeText renders at a fixed pixel size, so the size steps with the Tailwind breakpoints.
  // Each step keeps the full one-line phrase inside the container (it also scales down to fit if it doesn't)
  const breakpoints = useBreakpoints(breakpointsTailwind)
  const fontSize = computed(() => {
    if (breakpoints.greaterOrEqual('lg').value) return 60
    if (breakpoints.greaterOrEqual('sm').value) return 40
    return 22
  })
  const letterSpacing = computed(() => -Math.round(fontSize.value / 40))

  // Electric strands around the seal: a bright core over a brand-green glow in dark mode,
  // and green "ink" strands in light mode (ElectricLogo's light theme draws dark on light)
  const mode = useColorMode()
  const isDark = computed(() => mode.value === 'dark')
  const electric = computed(() => {
    const primary = resolveTokenHex('--primary')
    return isDark.value
      ? { color: resolveTokenHex('--foreground'), glowColor: primary, theme: 'dark' as const }
      : { color: primary, glowColor: primary, theme: 'light' as const }
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
