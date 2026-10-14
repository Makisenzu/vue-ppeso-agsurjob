import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useSpesStore } from '@/stores/peso/provincialPeso/spesStore'
import {
  drawRandomSpesCandidates,
  secureRandomIndex,
  SPES_UNSPECIFIED_MUNICIPALITY,
} from '@/helpers/peso/provincialPeso/spesHelper'
import type { SpesDrawCandidate } from '@/types/peso/provincialPeso/spes'

const SPIN_DURATION_MS = 4200
const REDUCED_MOTION_SPIN_DURATION_MS = 300
const EXTRA_TURNS = 5
/** How long the landed segment stays highlighted before it leaves the wheel. */
const REVEAL_PAUSE_MS = 1100
/** Above this many names the wheel only shows numbers; the full list is beside it. */
const MAX_WHEEL_LABELS = 24
/** Literal class names so Tailwind generates them; alternates bright and deep tones so neighbours stand apart. */
const SEGMENT_FILLS = ['fill-chart-4', 'fill-chart-1', 'fill-chart-5', 'fill-chart-2'] as const

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

function shortName(name: string): string {
  return name.length > 16 ? `${name.slice(0, 15)}…` : name
}

/** Point on the wheel circle; 0° is the top (where the pointer is), angles go clockwise. */
function polar(radius: number, degrees: number) {
  const radians = ((degrees - 90) * Math.PI) / 180
  return { x: radius * Math.cos(radians), y: radius * Math.sin(radians) }
}

/**
 * Provincial PESO randomizer: draws SPES applicants per municipality, by spinning the wheel one
 * name at a time or by drawing every remaining slot at once. Only Pending applicants who attached
 * all 5 documentary requirements are in the pool; the drawn ones are approved on confirmation and
 * the appointment form opens for each of them, the others stay Pending.
 */
export function useSpesDraw() {
  const store = useSpesStore()
  const { drawPool, isLoadingDrawPool, isDrawOpen, isSubmitting } = storeToRefs(store)
  const { approveDrawWinners, closeDrawDialog, fetchDrawPool } = store

  const selectedMunicipality = ref<string | null>(null)
  const slots = ref(1)
  const winners = ref<SpesDrawCandidate[]>([])
  const lastDrawn = ref<SpesDrawCandidate | null>(null)

  // ─── Wheel state ───
  const rotation = ref(0)
  const isSpinning = ref(false)
  /** Segment the wheel just landed on, highlighted until it leaves the wheel. */
  const landedId = ref<string | null>(null)
  let frameId: number | null = null
  let revealTimer: ReturnType<typeof setTimeout> | null = null

  const municipalityOptions = computed(() =>
    drawPool.value.map((group) => ({
      value: group.municipality,
      label: `${group.municipality} (${group.candidates.length})`,
      isUnspecified: group.municipality === SPES_UNSPECIFIED_MUNICIPALITY,
    }))
  )

  const selectedGroup = computed(
    () => drawPool.value.find((group) => group.municipality === selectedMunicipality.value) ?? null
  )

  const drawnIds = computed(() => new Set(winners.value.map((winner) => winner.form.id)))

  /** Candidates still on the wheel. */
  const remaining = computed(() =>
    (selectedGroup.value?.candidates ?? []).filter((candidate) => !drawnIds.value.has(candidate.form.id))
  )

  const maxSlots = computed(() => Math.max(1, selectedGroup.value?.candidates.length ?? 1))
  const slotsLeft = computed(() => Math.max(0, slots.value - winners.value.length))
  const canDraw = computed(() => !isSpinning.value && !isSubmitting.value && slotsLeft.value > 0 && remaining.value.length > 0)
  const canConfirm = computed(() => !isSpinning.value && !isSubmitting.value && winners.value.length > 0)
  /** Applicants from a municipality-less form can still be drawn, but PESO should fix the forms first. */
  const isUnspecifiedMunicipality = computed(() => selectedMunicipality.value === SPES_UNSPECIFIED_MUNICIPALITY)

  /** SVG segments of the wheel, one per remaining candidate. */
  const wheelSegments = computed(() => {
    const candidates = remaining.value
    const count = candidates.length
    if (!count) return []
    const sweep = 360 / count
    const showLabels = count <= MAX_WHEEL_LABELS

    return candidates.map((candidate, index) => {
      const start = index * sweep
      const end = start + sweep
      const from = polar(96, start)
      const to = polar(96, end)
      const largeArc = sweep > 180 ? 1 : 0
      const middle = start + sweep / 2
      const peg = polar(90, start)
      return {
        id: candidate.form.id,
        // A single candidate fills the wheel, which an arc path cannot draw
        path: count === 1 ? null : `M 0 0 L ${from.x} ${from.y} A 96 96 0 ${largeArc} 1 ${to.x} ${to.y} Z`,
        colorClass: SEGMENT_FILLS[index % SEGMENT_FILLS.length],
        label: showLabels ? shortName(candidate.name) : String(index + 1),
        // Text runs from the hub outwards along the middle of the segment
        labelTransform: `rotate(${middle - 90}) translate(${count === 1 ? 0 : 58} 0)`,
        // Small peg on each segment boundary, like a prize wheel; hidden when the segments get too thin
        peg: count > 1 && showLabels ? peg : null,
      }
    })
  })

  const resetWheel = () => {
    if (frameId !== null) cancelAnimationFrame(frameId)
    if (revealTimer !== null) clearTimeout(revealTimer)
    frameId = null
    revealTimer = null
    landedId.value = null
    isSpinning.value = false
    rotation.value = 0
  }

  const resetDraw = () => {
    resetWheel()
    winners.value = []
    lastDrawn.value = null
  }

  // A new municipality starts a new draw
  watch(selectedMunicipality, () => {
    resetDraw()
    slots.value = Math.min(slots.value, maxSlots.value)
  })

  // Pick the first municipality once the pool has loaded, and drop a municipality that emptied
  watch(
    drawPool,
    (groups) => {
      if (!groups.some((group) => group.municipality === selectedMunicipality.value)) {
        selectedMunicipality.value = groups[0]?.municipality ?? null
      }
    },
    { immediate: true }
  )

  const setSlots = (value: unknown) => {
    const parsed = Math.floor(Number(value))
    slots.value = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), maxSlots.value) : 1
  }

  /** Spins the wheel and draws one applicant; the winner is picked first, the animation just lands on them. */
  const spin = () => {
    if (!canDraw.value) return
    const candidates = remaining.value
    const winnerIndex = secureRandomIndex(candidates.length)
    const winner = candidates[winnerIndex]!
    const sweep = 360 / candidates.length
    // Small random offset inside the segment so it does not always stop dead centre
    const offset = (secureRandomIndex(1000) / 1000 - 0.5) * sweep * 0.7
    const target = 360 * EXTRA_TURNS + (360 - (winnerIndex * sweep + sweep / 2 + offset))

    const startRotation = rotation.value % 360
    const distance = target - startRotation
    const duration = prefersReducedMotion() ? REDUCED_MOTION_SPIN_DURATION_MS : SPIN_DURATION_MS
    const startedAt = performance.now()
    isSpinning.value = true
    lastDrawn.value = null

    const step = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration)
      rotation.value = startRotation + distance * easeOutCubic(progress)
      if (progress < 1) {
        frameId = requestAnimationFrame(step)
        return
      }
      frameId = null
      // Hold on the landed segment for a moment; the wheel stays locked until the winner leaves it
      landedId.value = winner.form.id
      lastDrawn.value = winner
      revealTimer = setTimeout(
        () => {
          revealTimer = null
          landedId.value = null
          isSpinning.value = false
          winners.value = [...winners.value, winner]
          // The winner leaves the wheel, so its segments are redrawn from the top
          rotation.value = 0
        },
        prefersReducedMotion() ? 0 : REVEAL_PAUSE_MS
      )
    }
    frameId = requestAnimationFrame(step)
  }

  /** Draws every remaining slot at once (quick randomizer, no animation). */
  const drawRemaining = () => {
    if (!canDraw.value) return
    const picks = drawRandomSpesCandidates(remaining.value, slotsLeft.value)
    winners.value = [...winners.value, ...picks]
    lastDrawn.value = picks[picks.length - 1] ?? null
  }

  const confirmWinners = async () => {
    const municipality = selectedMunicipality.value
    if (!canConfirm.value || !municipality) return
    const ok = await approveDrawWinners(
      winners.value.map((winner) => winner.form.id),
      municipality
    )
    // Approved forms leave the Pending pool on their own
    if (ok) resetDraw()
  }

  const onOpenChange = (open: boolean) => {
    if (open) return
    if (isSpinning.value) return
    resetDraw()
    closeDrawDialog()
  }

  onBeforeUnmount(resetWheel)

  return {
    isDrawOpen,
    isLoadingDrawPool,
    isSubmitting,
    municipalityOptions,
    selectedMunicipality,
    selectedGroup,
    isUnspecifiedMunicipality,
    slots,
    maxSlots,
    slotsLeft,
    winners,
    lastDrawn,
    remaining,
    drawnIds,
    rotation,
    isSpinning,
    landedId,
    wheelSegments,
    canDraw,
    canConfirm,
    setSlots,
    spin,
    drawRemaining,
    resetDraw,
    confirmWinners,
    refreshPool: fetchDrawPool,
    onOpenChange,
  }
}
