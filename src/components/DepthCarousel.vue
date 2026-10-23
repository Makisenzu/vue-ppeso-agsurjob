<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, type ComponentPublicInstance } from 'vue';
import gsap from 'gsap';

export type DepthCarouselItem = string | { image: string; alt?: string };
export type TiltDirection = 'left' | 'right';

interface DepthCarouselProps {
  items?: DepthCarouselItem[];
  cardWidth?: number;
  cardHeight?: number;
  radius?: number;
  tint?: string;
  depth?: number;
  spread?: number;
  tilt?: number;
  tiltDirection?: TiltDirection;
  perspective?: number;
  visibleCards?: number;
  falloff?: number;
  blur?: number;
  duration?: number;
  ease?: string;
  autoplay?: boolean;
  autoplayDelay?: number;
  loop?: boolean;
  showControls?: boolean;
  showIndicators?: boolean;
}

interface DragState {
  x: number;
  startPos: number;
  lastX: number;
  lastT: number;
  v: number;
  moved: boolean;
  id: number;
}

const clamp = (v: number, min: number, max: number): number => Math.min(Math.max(v, min), max);
const normalizeItem = (it: DepthCarouselItem): { image: string; alt?: string } =>
  typeof it === 'string' ? { image: it, alt: '' } : it;

const props = withDefaults(defineProps<DepthCarouselProps>(), {
  items: () => [
    { image: 'https://picsum.photos/seed/depth1/800/1000', alt: 'Slide 1' },
    { image: 'https://picsum.photos/seed/depth2/800/1000', alt: 'Slide 2' },
    { image: 'https://picsum.photos/seed/depth3/800/1000', alt: 'Slide 3' },
    { image: 'https://picsum.photos/seed/depth4/800/1000', alt: 'Slide 4' },
    { image: 'https://picsum.photos/seed/depth5/800/1000', alt: 'Slide 5' },
    { image: 'https://picsum.photos/seed/depth6/800/1000', alt: 'Slide 6' }
  ],
  cardWidth: 300,
  cardHeight: 380,
  radius: 18,
  tint: '#05060a',
  depth: 220,
  spread: 90,
  tilt: 22,
  tiltDirection: 'right',
  perspective: 1400,
  visibleCards: 4,
  falloff: 0.2,
  blur: 6,
  duration: 700,
  ease: 'power3.out',
  autoplay: false,
  autoplayDelay: 3200,
  loop: true,
  showControls: true,
  showIndicators: true
});

const emit = defineEmits<{
  change: [index: number, item: { image: string; alt?: string }];
}>();

const data = computed(() => (Array.isArray(props.items) ? props.items : []).map(normalizeItem));
const count = computed(() => data.value.length);

const rootRef = ref<HTMLDivElement | null>(null);
const cardRefs = ref<(HTMLDivElement | null)[]>([]);
const overlayRefs = ref<(HTMLSpanElement | null)[]>([]);

const setCardRef = (el: Element | ComponentPublicInstance | null, index: number) => {
  cardRefs.value[index] = el as HTMLDivElement | null;
};
const setOverlayRef = (el: Element | ComponentPublicInstance | null, index: number) => {
  overlayRefs.value[index] = el as HTMLSpanElement | null;
};

const active = ref(0);

let pos = 0;
let focusIndex = 0;
let tween: gsap.core.Tween | null = null;
let scale = 1;
let drag: DragState | null = null;
let wheelTimer: ReturnType<typeof setTimeout> | null = null;
let reduced = false;

const layout = (p: number) => {
  const n = count.value;
  if (!n) return;
  const dir = props.tiltDirection === 'left' ? -1 : 1;

  for (let i = 0; i < n; i++) {
    const el = cardRefs.value[i];
    if (!el) continue;

    let d = i - p;
    if (props.loop && n > 1) {
      d = ((d % n) + n) % n;
      if (d > n / 2) d -= n;
    }

    const back = Math.max(0, d);
    const az = Math.abs(d);
    const shown = az <= props.visibleCards + 0.5;

    const tz = -props.depth * d;
    const tx = dir * props.spread * d;
    const ry = dir * props.tilt * clamp(d, 0, 1);

    let opacity = d < 0 ? Math.max(0, 1 + d) : 1;
    if (!shown) opacity = 0;

    const brightness = Math.max(0.15, 1 - back * props.falloff);
    const blurPx = props.blur > 0 ? Math.min(props.blur, (back / Math.max(1, props.visibleCards)) * props.blur) : 0;
    const zi = Math.round(2000 - d * 20);

    el.style.transform = `translate(-50%, -50%) scale(${scale}) translateX(${tx.toFixed(2)}px) translateZ(${tz.toFixed(2)}px) rotateY(${ry.toFixed(3)}deg)`;
    el.style.opacity = opacity.toFixed(3);
    el.style.filter = `brightness(${brightness.toFixed(3)}) blur(${blurPx.toFixed(2)}px)`;
    el.style.zIndex = String(zi);
    el.style.pointerEvents = shown && opacity > 0.05 ? 'auto' : 'none';

    const ov = overlayRefs.value[i];
    if (ov) ov.style.opacity = clamp(back * props.falloff * 1.25, 0, 0.86).toFixed(3);
  }
};

const notify = (idx: number) => {
  active.value = idx;
  emit('change', idx, data.value[idx]);
};

const tweenTo = (target: number, animate: boolean) => {
  tween?.kill();
  const proxy = { p: pos };
  const dur = animate && !reduced ? props.duration / 1000 : 0;
  tween = gsap.to(proxy, {
    p: target,
    duration: dur,
    ease: props.ease,
    onUpdate: () => {
      pos = proxy.p;
      layout(proxy.p);
    },
    onComplete: () => {
      const n = count.value;
      if (n > 0) pos = ((pos % n) + n) % n;
      layout(pos);
    }
  });
};

const setFocus = (rawIndex: number, animate = true) => {
  const n = count.value;
  if (!n) return;
  const idx = props.loop ? ((rawIndex % n) + n) % n : clamp(rawIndex, 0, n - 1);
  let delta = idx - pos;
  if (props.loop && n > 1) {
    delta = ((delta % n) + n) % n;
    if (delta > n / 2) delta -= n;
  }
  tweenTo(pos + delta, animate);
  if (idx !== focusIndex) {
    focusIndex = idx;
    notify(idx);
  }
};

const navigateBy = (step: number) => setFocus(focusIndex + step, true);

const onPointerDown = (e: PointerEvent) => {
  if (count.value < 2) return;
  tween?.kill();
  drag = {
    x: e.clientX,
    startPos: pos,
    lastX: e.clientX,
    lastT: performance.now(),
    v: 0,
    moved: false,
    id: e.pointerId
  };
};

const onPointerMove = (e: PointerEvent) => {
  if (!drag) return;
  const stepPx = Math.max(props.cardWidth * 0.55 * scale, 40);
  const dx = e.clientX - drag.x;
  if (!drag.moved && Math.abs(dx) > 4) {
    drag.moved = true;
    rootRef.value?.setPointerCapture(drag.id);
  }
  if (!drag.moved) return;
  const now = performance.now();
  const dt = Math.max(now - drag.lastT, 1);
  drag.v = (e.clientX - drag.lastX) / dt;
  drag.lastX = e.clientX;
  drag.lastT = now;
  pos = drag.startPos - dx / stepPx;
  layout(pos);
};

const onPointerEnd = () => {
  const d = drag;
  if (!d) return;
  drag = null;
  if (!d.moved) return;
  const stepPx = Math.max(props.cardWidth * 0.55 * scale, 40);
  const projected = pos - (d.v * 180) / stepPx;
  setFocus(Math.round(projected), true);
};

const onKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'ArrowLeft') {
    e.preventDefault();
    navigateBy(-1);
  } else if (e.key === 'ArrowRight') {
    e.preventDefault();
    navigateBy(1);
  }
};

const onCardClick = (index: number) => {
  if (drag?.moved) return;
  setFocus(index, true);
};

let ro: ResizeObserver | null = null;
let removeWheelListener: (() => void) | null = null;
let stopAutoplay: (() => void) | null = null;

const setupAutoplay = () => {
  reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!props.autoplay || reduced || count.value < 2) return;

  const root = rootRef.value;
  let hovered = false;
  let focused = false;
  let timer: ReturnType<typeof setInterval> | null = null;

  const stop = () => {
    if (timer) clearInterval(timer);
    timer = null;
  };
  const start = () => {
    stop();
    timer = setInterval(
      () => {
        if (!hovered && !focused) navigateBy(1);
      },
      Math.max(props.autoplayDelay, 600)
    );
  };
  const onEnter = () => {
    hovered = true;
  };
  const onLeave = () => {
    hovered = false;
  };
  const onFocusIn = () => {
    focused = true;
  };
  const onFocusOut = () => {
    focused = false;
  };

  root?.addEventListener('mouseenter', onEnter);
  root?.addEventListener('mouseleave', onLeave);
  root?.addEventListener('focusin', onFocusIn);
  root?.addEventListener('focusout', onFocusOut);
  start();

  stopAutoplay = () => {
    stop();
    root?.removeEventListener('mouseenter', onEnter);
    root?.removeEventListener('mouseleave', onLeave);
    root?.removeEventListener('focusin', onFocusIn);
    root?.removeEventListener('focusout', onFocusOut);
  };
};

onMounted(() => {
  const root = rootRef.value;
  if (root) {
    ro = new ResizeObserver(entries => {
      const w = entries[0].contentRect.width;
      const needed = props.cardWidth + Math.abs(props.spread) * 2 + 120;
      scale = clamp(w / needed, 0.4, 1);
      layout(pos);
    });
    ro.observe(root);

    const onWheel = (e: WheelEvent) => {
      if (count.value < 2) return;
      e.preventDefault();
      tween?.kill();
      const raw = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      const delta = e.deltaMode === 1 ? raw * 24 : raw;
      const step = clamp(delta / (props.cardWidth * 0.9), -0.6, 0.6);
      pos += step;
      layout(pos);
      if (wheelTimer) clearTimeout(wheelTimer);
      wheelTimer = setTimeout(() => setFocus(Math.round(pos), true), 130);
    };
    root.addEventListener('wheel', onWheel, { passive: false });
    removeWheelListener = () => {
      root.removeEventListener('wheel', onWheel);
      if (wheelTimer) clearTimeout(wheelTimer);
    };
  }

  layout(pos);
  setupAutoplay();
});

onUnmounted(() => {
  tween?.kill();
  if (wheelTimer) clearTimeout(wheelTimer);
  ro?.disconnect();
  removeWheelListener?.();
  stopAutoplay?.();
});

// Re-run the autoplay setup whenever its own inputs change.
watch(
  () => [props.autoplay, props.autoplayDelay, count.value],
  () => {
    stopAutoplay?.();
    stopAutoplay = null;
    setupAutoplay();
  }
);

// Re-lay the cards out whenever anything affecting their geometry changes.
watch(
  () => [
    props.depth,
    props.spread,
    props.tilt,
    props.tiltDirection,
    props.visibleCards,
    props.falloff,
    props.blur,
    props.cardWidth,
    props.cardHeight,
    props.radius,
    count.value
  ],
  () => layout(pos)
);
</script>

<template>
  <div
    ref="rootRef"
    class="relative flex justify-center items-center focus-visible:rounded-xl outline-none focus-visible:outline-2 focus-visible:outline-white/50 focus-visible:outline-offset-4 w-full h-full min-h-80 perspective-origin-[50%_50%] touch-pan-y cursor-grab active:cursor-grabbing select-none"
    :style="{ perspective: `${perspective}px` }"
    role="group"
    aria-roledescription="carousel"
    aria-label="Depth carousel"
    tabindex="0"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerEnd"
    @pointercancel="onPointerEnd"
    @keydown="onKeyDown"
  >
    <div ref="stageRef" class="absolute inset-0 transform-3d">
      <div
        v-for="(item, i) in data"
        :key="i"
        :ref="(el: Element | ComponentPublicInstance | null) => setCardRef(el, i)"
        class="top-1/2 left-1/2 absolute bg-[#0b0d12] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.65),0_8px_20px_-10px_rgba(0,0,0,0.5)] overflow-hidden transform-[translate(-50%,-50%)] origin-center cursor-pointer will-change-[transform,opacity,filter]"
        :style="{ width: `${cardWidth}px`, height: `${cardHeight}px`, borderRadius: `${radius}px` }"
        aria-roledescription="slide"
        :aria-label="`${i + 1} of ${count}`"
        :aria-hidden="active !== i"
        @click="onCardClick(i)"
      >
        <img
          class="block w-full h-full object-cover pointer-events-none select-none [-webkit-user-drag:none]"
          :src="item.image"
          :alt="item.alt || ''"
          :draggable="false"
        />
        <span
          :ref="(el: Element | ComponentPublicInstance | null) => setOverlayRef(el, i)"
          class="absolute inset-0 opacity-0 pointer-events-none mix-blend-multiply"
          :style="{ background: tint }"
        />
      </div>
    </div>

    <template v-if="showControls && count > 1">
      <button
        type="button"
        class="top-1/2 left-4 z-3000 absolute place-items-center grid bg-[rgba(18,20,26,0.55)] hover:bg-[rgba(28,31,40,0.85)] backdrop-blur-md border border-white/20 hover:border-white/40 rounded-full w-10.5 h-10.5 text-white active:scale-95 transition-[background,border-color,transform] -translate-y-1/2 duration-200"
        aria-label="Previous slide"
        @click="navigateBy(-1)"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path
            d="M15 5l-7 7 7 7"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
      <button
        type="button"
        class="top-1/2 right-4 z-3000 absolute place-items-center grid bg-[rgba(18,20,26,0.55)] hover:bg-[rgba(28,31,40,0.85)] backdrop-blur-md border border-white/20 hover:border-white/40 rounded-full w-10.5 h-10.5 text-white active:scale-95 transition-[background,border-color,transform] -translate-y-1/2 duration-200"
        aria-label="Next slide"
        @click="navigateBy(1)"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path
            d="M9 5l7 7-7 7"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
    </template>

    <div
      v-if="showIndicators && count > 1"
      class="bottom-4 left-1/2 z-3000 absolute flex gap-2 bg-[rgba(14,16,22,0.4)] backdrop-blur-sm px-3 py-2 rounded-full -translate-x-1/2"
      role="tablist"
      aria-label="Slides"
    >
      <button
        v-for="(_, i) in data"
        :key="i"
        type="button"
        role="tab"
        :aria-selected="active === i"
        :aria-label="`Go to slide ${i + 1}`"
        class="rounded-full h-1.75 transition-[width,background] duration-250 cursor-pointer"
        :class="active === i ? 'w-5 bg-white' : 'w-1.75 bg-white/30'"
        @click="setFocus(i, true)"
      />
    </div>
  </div>
</template>
