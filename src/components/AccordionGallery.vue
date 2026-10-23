<script setup lang="ts">
import { gsap } from 'gsap';
import { computed, onMounted, onUnmounted, ref, watch, type CSSProperties, type ComponentPublicInstance } from 'vue';

export interface AccordionGalleryItem {
  image: string;
  label?: string;
  link?: string;
  alt?: string;
}

export type Orientation = 'horizontal' | 'vertical';
export type Trigger = 'hover' | 'click';

interface AccordionGalleryProps {
  items?: AccordionGalleryItem[];
  defaultIndex?: number;
  accentColor?: string;
  overlayColor?: string;
  textColor?: string;
  height?: number;
  gap?: number;
  radius?: number;
  expandRatio?: number;
  orientation?: Orientation;
  duration?: number;
  ease?: string;
  parallax?: number;
  tilt?: number;
  stagger?: number;
  trigger?: Trigger;
  showLabels?: boolean;
  grayscale?: boolean;
}

const props = withDefaults(defineProps<AccordionGalleryProps>(), {
  items: () => [
    { image: 'https://picsum.photos/id/1015/900/1200', label: 'Canyon', link: '#' },
    { image: 'https://picsum.photos/id/1018/900/1200', label: 'Ridgeline', link: '#' },
    { image: 'https://picsum.photos/id/1039/900/1200', label: 'Falls', link: '#' },
    { image: 'https://picsum.photos/id/1043/900/1200', label: 'Harbour', link: '#' },
    { image: 'https://picsum.photos/id/1044/900/1200', label: 'Skyline', link: '#' }
  ],
  defaultIndex: 2,
  accentColor: '#ffffff',
  overlayColor: '#060010',
  textColor: '#ffffff',
  height: 460,
  gap: 10,
  radius: 16,
  expandRatio: 0.52,
  orientation: 'horizontal',
  duration: 0.6,
  ease: 'power3.out',
  parallax: 0.5,
  tilt: 8,
  stagger: 0.06,
  trigger: 'hover',
  showLabels: true,
  grayscale: true
});

const rootRef = ref<HTMLDivElement | null>(null);
const panelRefs = ref<(HTMLElement | null)[]>([]);
const mediaRefs = ref<(HTMLElement | null)[]>([]);
const barRefs = ref<(HTMLElement | null)[]>([]);
const textRefs = ref<(HTMLElement | null)[]>([]);

const setPanelRef = (el: Element | ComponentPublicInstance | null, index: number) => {
  panelRefs.value[index] = el as HTMLElement | null;
};
const setMediaRef = (el: Element | ComponentPublicInstance | null, index: number) => {
  mediaRefs.value[index] = el as HTMLElement | null;
};
const setBarRef = (el: Element | ComponentPublicInstance | null, index: number) => {
  barRefs.value[index] = el as HTMLElement | null;
};
const setTextRef = (el: Element | ComponentPublicInstance | null, index: number) => {
  textRefs.value[index] = el as HTMLElement | null;
};

const vertical = computed(() => props.orientation === 'vertical');
const active = ref(Math.min(Math.max(props.defaultIndex, 0), props.items.length - 1));

const prefersReduced =
  typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

const overlayBg = computed(
  () =>
    `linear-gradient(180deg, transparent 45%, color-mix(in srgb, ${props.overlayColor} 78%, transparent) 100%), color-mix(in srgb, ${props.overlayColor} calc(var(--ag-dim, 0.35) * 100%), transparent)`
);

const rootStyle = computed<CSSProperties>(() => ({
  gap: `${props.gap}px`,
  height: vertical.value ? `${Math.round(props.height * 1.6)}px` : `${props.height}px`
}));

// Mutable, non-reactive state — mirrors the React version's plain useRef
// values that don't need to trigger re-renders.
let tl: gsap.core.Timeline | null = null;
let mediaSize = 320;
let firstRun = true;
let ro: ResizeObserver | null = null;

const applyLayout = (animate: boolean) => {
  const panels = panelRefs.value;
  if (!panels.length) return;

  const n = props.items.length;
  const r = Math.min(Math.max(props.expandRatio, 0.2), 0.9);
  const grow = n > 1 ? (r * (n - 1)) / (1 - r) : 1;

  tl?.kill();
  const dur = animate && !prefersReduced ? props.duration : 0;
  const timeline = gsap.timeline();

  panels.forEach((panel, i) => {
    if (!panel) return;
    const isActive = i === active.value;
    const media = mediaRefs.value[i];
    const bar = barRefs.value[i];
    const text = textRefs.value[i];

    const rot = isActive ? 0 : i < active.value ? props.tilt : -props.tilt;
    const rotProp = vertical.value ? { rotateX: -rot } : { rotateY: rot };

    timeline.to(panel, { flexGrow: isActive ? grow : 1, ...rotProp, duration: dur, ease: props.ease }, 0);

    if (media) {
      const drift = Math.max(-1.5, Math.min(1.5, active.value - i));
      const shift = drift * props.parallax * mediaSize * 0.06;
      const gray = props.grayscale ? (isActive ? 0 : 1) : 0;
      timeline.to(
        media,
        {
          xPercent: -50,
          yPercent: -50,
          x: vertical.value ? 0 : isActive ? 0 : shift,
          y: vertical.value ? (isActive ? 0 : shift) : 0,
          '--ag-gray': gray,
          '--ag-dim': isActive ? 0 : 0.35,
          duration: dur,
          ease: props.ease
        },
        0
      );
    }

    if (props.showLabels && bar && text) {
      if (isActive) {
        timeline.to(
          [bar, text],
          { opacity: 1, x: 0, duration: dur, ease: props.ease, stagger: prefersReduced ? 0 : props.stagger },
          0
        );
      } else {
        timeline.to([bar, text], { opacity: 0, x: -14, duration: dur * 0.6, ease: props.ease }, 0);
      }
    }
  });

  tl = timeline;
};

const measure = () => {
  const el = rootRef.value;
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const total = vertical.value ? rect.height : rect.width;
  const usable = Math.max(total - props.gap * (props.items.length - 1), 120);
  const size = Math.max(140, usable * Math.min(Math.max(props.expandRatio, 0.2), 0.9) * 1.22);
  mediaSize = size;
  el.style.setProperty('--ag-media-size', `${size}px`);
  applyLayout(!firstRun);
};

onMounted(() => {
  measure();
  firstRun = false;

  const el = rootRef.value;
  if (el) {
    ro = new ResizeObserver(measure);
    ro.observe(el);
  }
});

onUnmounted(() => {
  ro?.disconnect();
  tl?.kill();
});

// Re-measure (and re-layout) whenever the container's own sizing inputs change.
watch(
  () => [props.gap, props.items.length, props.expandRatio, vertical.value],
  () => measure()
);

// Re-run the animation whenever anything affecting the layout itself changes.
watch(
  () => [
    active.value,
    props.items.length,
    props.expandRatio,
    props.duration,
    props.ease,
    vertical.value,
    props.tilt,
    props.parallax,
    props.grayscale,
    props.showLabels,
    props.stagger
  ],
  () => applyLayout(!firstRun)
);

const handleEnter = (i: number) => {
  if (props.trigger === 'hover') active.value = i;
};

const handleClick = (i: number, e: MouseEvent) => {
  if (i !== active.value) {
    e.preventDefault();
    active.value = i;
  }
};

const handleKeyDown = (i: number, e: KeyboardEvent) => {
  const n = props.items.length;
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
    e.preventDefault();
    active.value = (i + 1) % n;
  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
    e.preventDefault();
    active.value = (i - 1 + n) % n;
  }
};
</script>

<template>
  <div
    ref="rootRef"
    class="flex max-[520px]:flex-col! w-full max-w-full perspective-[1400px] max-[520px]:perspective-none"
    :class="vertical ? 'flex-col' : 'flex-row'"
    :style="rootStyle"
    role="list"
    aria-label="Image accordion gallery"
  >
    <component
      :is="item.link ? 'a' : 'div'"
      v-for="(item, i) in items"
      :key="i"
      :ref="(el: Element | ComponentPublicInstance | null) => setPanelRef(el, i)"
      class="group block relative flex-[1_1_0] bg-[#0a0713] outline-none min-w-0 min-h-0 max-[520px]:min-h-21 overflow-hidden no-underline transform-3d max-[520px]:transform-none! origin-center cursor-pointer [box-shadow:0_10px_30px_-18px_rgba(0,0,0,0.8)] focus-visible:[box-shadow:0_0_0_2px_var(--ag-accent),0_10px_30px_-18px_rgba(0,0,0,0.8)]"
      :style="
        {
          borderRadius: `${radius}px`,
          '--ag-accent': accentColor,
          willChange: 'flex-grow, transform'
        } as CSSProperties
      "
      :href="item.link || undefined"
      @click="(e: MouseEvent) => handleClick(i, e)"
      @mouseenter="handleEnter(i)"
      @focus="active = i"
      @keydown="(e: KeyboardEvent) => handleKeyDown(i, e)"
      role="listitem"
      tabindex="0"
      :aria-current="active === i ? 'true' : undefined"
      :aria-label="item.label"
    >
      <span class="absolute inset-0 rounded-[inherit] overflow-hidden">
        <span
          :ref="(el: Element | ComponentPublicInstance | null) => setMediaRef(el, i)"
          class="top-1/2 left-1/2 absolute filter-[grayscale(var(--ag-gray,1))]"
          :style="{
            width: vertical ? '100%' : 'var(--ag-media-size, 320px)',
            height: vertical ? 'var(--ag-media-size, 320px)' : '100%',
            willChange: 'transform, filter'
          }"
        >
          <img
            :src="item.image"
            :alt="item.alt || item.label || ''"
            :draggable="false"
            class="block w-full h-full object-cover select-none [-webkit-user-drag:none]"
          />
        </span>
        <span class="absolute inset-0 pointer-events-none" :style="{ background: overlayBg }" aria-hidden="true" />
      </span>
      <span
        v-if="showLabels"
        class="right-5 bottom-5 left-5 z-2 absolute flex items-center gap-3 pointer-events-none"
        aria-hidden="true"
      >
        <span
          :ref="(el: Element | ComponentPublicInstance | null) => setBarRef(el, i)"
          class="flex-none opacity-0 rounded-[3px] w-0.75 h-6.5"
          :style="{
            background: accentColor,
            boxShadow: `0 0 12px color-mix(in srgb, ${accentColor} 60%, transparent)`
          }"
        />
        <span
          :ref="(el: Element | ComponentPublicInstance | null) => setTextRef(el, i)"
          class="opacity-0 overflow-hidden font-semibold text-[clamp(1rem,1.4vw,1.4rem)] text-ellipsis tracking-[0.01em] whitespace-nowrap [text-shadow:0_2px_14px_rgba(0,0,0,0.55)]"
          :style="{ color: textColor }"
        >
          {{ item.label }}
        </span>
      </span>
    </component>
  </div>
</template>
