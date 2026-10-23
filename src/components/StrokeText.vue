<script setup lang="ts">
import { gsap } from 'gsap';
import { computed, onMounted, onUnmounted, ref, watch, type CSSProperties } from 'vue';

export type StrokeTextTrigger = 'mount' | 'hover' | 'scroll' | 'loop';
export type StrokeTextFillMode = 'wipe' | 'fade' | 'none';

interface StrokeTextProps {
  text?: string;
  strokeColor?: string;
  fillColor?: string;
  strokeWidth?: number;
  drawDuration?: number;
  fillDelay?: number;
  delay?: number;
  stagger?: number;
  ease?: string;
  trigger?: StrokeTextTrigger;
  fillMode?: StrokeTextFillMode;
  /** Fade the outline away once the fill lands, leaving crisp solid text */
  strokeFade?: boolean;
  /** Sweep a band of light across the text after it fills */
  sheen?: boolean;
  sheenColor?: string;
  fontSize?: number;
  fontWeight?: number | string;
  letterSpacing?: number;
  reverse?: boolean;
  className?: string;
  style?: CSSProperties;
}

interface StrokeTextBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

const props = withDefaults(defineProps<StrokeTextProps>(), {
  text: 'Draw Attention',
  strokeColor: '#8bfa99',
  fillColor: '#F8FAFC',
  strokeWidth: 1.4,
  drawDuration: 1.6,
  fillDelay: 0.2,
  delay: 0,
  stagger: 0.05,
  ease: 'power3.inOut',
  trigger: 'mount',
  fillMode: 'wipe',
  strokeFade: true,
  sheen: true,
  sheenColor: 'var(--sheen)',
  fontSize: 128,
  fontWeight: 800,
  letterSpacing: -4,
  reverse: false,
  className: ''
});

const rootRef = ref<HTMLSpanElement | null>(null);
const svgRef = ref<SVGSVGElement | null>(null);
const strokeTextRef = ref<SVGTextElement | null>(null);
const wipeRectRef = ref<SVGRectElement | null>(null);
const sheenGradRef = ref<SVGLinearGradientElement | null>(null);

const box = ref<StrokeTextBox | null>(null);

const uid = Math.random().toString(36).slice(2, 10);
const wipeId = `stroke-text-wipe-${uid}`;
const wipeGradId = `stroke-text-wipe-grad-${uid}`;
const sheenId = `stroke-text-sheen-${uid}`;

const characters = computed(() => Array.from(String(props.text ?? '')));
// Must exceed the longest glyph outline, or the dash pattern repeats and the draw shows gaps
const dash = computed(() => Math.max(props.fontSize * 8, 200));

const fontStyle = computed<CSSProperties>(() => ({
  fontSize: `${props.fontSize}px`,
  fontWeight: props.fontWeight,
  letterSpacing: `${props.letterSpacing}px`
}));
// Colors are set as styles, not SVG attributes, so CSS variables like var(--primary) resolve
const strokeStyle = computed<CSSProperties>(() => ({ ...fontStyle.value, stroke: props.strokeColor }));
const fillStyle = computed<CSSProperties>(() => ({ ...fontStyle.value, fill: props.fillColor }));

const viewBox = computed(() =>
  box.value
    ? `${box.value.x} ${box.value.y} ${box.value.width} ${box.value.height}`
    : `0 ${-props.fontSize} 600 ${props.fontSize * 1.3}`
);

// Soft leading edge of the wipe and width of the sheen band, both scaled to the text height
const feather = computed(() => (box.value ? box.value.height * 0.6 : 0));
const sheenBand = computed(() => (box.value ? box.value.height * 1.2 : 0));
const wipeStartX = computed(() => (box.value ? box.value.x - box.value.width - feather.value : 0));
// Where the wipe gradient goes from fully shown to hidden, as a fraction of the wipe rect
const wipeSolidStop = computed(() => (box.value ? box.value.width / (box.value.width + feather.value) : 1));

let cancelMeasure: (() => void) | null = null;

const runMeasure = () => {
  cancelMeasure?.();
  let cancelled = false;
  cancelMeasure = () => {
    cancelled = true;
  };

  const measureOnce = () => {
    if (cancelled) return;
    const node = strokeTextRef.value;
    if (!node) return;
    let bbox: DOMRect | undefined;
    try {
      bbox = node.getBBox();
    } catch {
      return;
    }
    if (!bbox || !bbox.width) return;

    const pad = Math.max(Number(props.strokeWidth) || 1, props.fontSize * 0.1);
    const next: StrokeTextBox = {
      x: bbox.x - pad,
      y: bbox.y - pad,
      width: bbox.width + pad * 2,
      height: bbox.height + pad * 2
    };

    const prev = box.value;
    box.value =
      prev &&
      Math.abs(prev.x - next.x) < 0.5 &&
      Math.abs(prev.width - next.width) < 0.5 &&
      Math.abs(prev.y - next.y) < 0.5
        ? prev
        : next;
  };

  // Measure once with the final font. Measuring with the fallback font first would start the
  // animation, then restart it mid-draw when the web font swaps in and the box changes
  const fonts = typeof document !== 'undefined' ? document.fonts : undefined;
  if (fonts && fonts.status !== 'loaded') {
    fonts.ready.then(measureOnce).catch(measureOnce);
  } else {
    measureOnce();
  }
};

onMounted(() => {
  runMeasure();
});

onUnmounted(() => {
  cancelMeasure?.();
  cancelMeasure = null;
});

watch(
  () => [characters.value, props.fontSize, props.fontWeight, props.letterSpacing, props.strokeWidth],
  () => runMeasure(),
  { flush: 'post' }
);

let animTeardown: (() => void) | null = null;

const setupAnimation = () => {
  const root = rootRef.value;
  const svg = svgRef.value;
  const b = box.value;
  if (typeof window === 'undefined' || !root || !svg || !b) return;

  const strokes = gsap.utils.toArray<Element>(root.querySelectorAll('[data-stroke-char]'));
  const fills = gsap.utils.toArray<Element>(root.querySelectorAll('[data-fill-char]'));
  const wipe = wipeRectRef.value;
  const sheenGrad = sheenGradRef.value;
  if (!strokes.length) return;

  const fillEnabled = props.fillMode !== 'none';
  const useWipe = fillEnabled && props.fillMode === 'wipe';
  const fadeStroke = fillEnabled && props.strokeFade;
  const fillDuration = Math.max(0.5, props.drawDuration * 0.5);
  const staggerConfig: number | gsap.StaggerVars = props.reverse
    ? { each: props.stagger, from: 'end' as const }
    : props.stagger;
  const sheenOff = { x1: b.x - sheenBand.value * 2, x2: b.x - sheenBand.value };
  const sheenDone = { x1: b.x + b.width, x2: b.x + b.width + sheenBand.value };
  const targets = [svg, ...strokes, ...fills, wipe, sheenGrad].filter(Boolean);

  const setStartState = () => {
    gsap.killTweensOf(targets);
    gsap.set(strokes, { strokeDasharray: dash.value, strokeDashoffset: dash.value, opacity: 0 });
    gsap.set(fills, { opacity: useWipe ? 1 : 0 });
    if (wipe) gsap.set(wipe, { attr: { x: wipeStartX.value } });
    if (sheenGrad) gsap.set(sheenGrad, { attr: sheenOff });
  };

  const setEndState = () => {
    gsap.killTweensOf(targets);
    gsap.set(svg, { autoAlpha: 1, y: 0 });
    gsap.set(strokes, { strokeDasharray: dash.value, strokeDashoffset: 0, opacity: fadeStroke ? 0 : 1 });
    gsap.set(fills, { opacity: fillEnabled ? 1 : 0 });
    if (wipe) gsap.set(wipe, { attr: { x: fillEnabled ? b.x : wipeStartX.value } });
    if (sheenGrad) gsap.set(sheenGrad, { attr: sheenOff });
  };

  const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) {
    setEndState();
    animTeardown = () => gsap.killTweensOf(targets);
    return;
  }

  const build = (): gsap.core.Timeline => {
    setStartState();
    const tl = gsap.timeline({
      paused: true,
      repeat: props.trigger === 'loop' ? -1 : 0,
      repeatDelay: props.trigger === 'loop' ? 0.9 : 0,
      // Hover replays should start right away, so only the first play waits
      delay: props.trigger === 'hover' ? 0 : props.delay,
      defaults: { overwrite: 'auto' }
    });

    // Hover replays in place; every other trigger lifts the text in as it starts drawing
    if (props.trigger !== 'hover') {
      tl.fromTo(svg, { autoAlpha: 0, y: props.fontSize * 0.08 }, { autoAlpha: 1, y: 0, duration: 0.7, ease: 'power3.out' }, 0);
    }

    tl.to(strokes, { opacity: 1, duration: 0.35, ease: 'power1.out', stagger: staggerConfig }, 0);
    tl.to(strokes, { strokeDashoffset: 0, duration: props.drawDuration, ease: props.ease, stagger: staggerConfig }, 0);

    const fillAt = props.drawDuration + props.fillDelay;
    if (useWipe && wipe) {
      tl.to(wipe, { attr: { x: b.x }, duration: fillDuration, ease: 'expo.inOut' }, fillAt);
    } else if (fillEnabled) {
      tl.to(fills, { opacity: 1, duration: fillDuration, ease: 'power2.out', stagger: staggerConfig }, fillAt);
    }

    if (fadeStroke) {
      tl.to(strokes, { opacity: 0, duration: 0.5, ease: 'power1.out' }, fillAt + fillDuration * 0.6);
    }

    if (props.sheen && fillEnabled && sheenGrad) {
      tl.to(sheenGrad, { attr: sheenDone, duration: 0.75, ease: 'power2.inOut' }, fillAt + fillDuration * 0.8);
    }

    return tl;
  };

  let timeline: gsap.core.Timeline | null = null;
  let scrollTrigger: { kill: () => void } | null = null;
  let removeHover: (() => void) | null = null;
  let tornDown = false;

  if (props.trigger === 'hover') {
    setEndState();
    const play = () => {
      timeline?.kill();
      timeline = build();
      timeline.play(0);
    };
    root.addEventListener('pointerenter', play);
    removeHover = () => root.removeEventListener('pointerenter', play);
  } else {
    timeline = build();
    if (props.trigger === 'scroll') {
      // Loaded on demand so pages that only play on mount don't ship ScrollTrigger
      void import('gsap/ScrollTrigger').then(({ ScrollTrigger }) => {
        if (tornDown) return;
        gsap.registerPlugin(ScrollTrigger);
        scrollTrigger = ScrollTrigger.create({
          trigger: root,
          start: 'top 82%',
          once: true,
          onEnter: () => timeline?.play(0)
        });
      });
    } else {
      timeline.play(0);
    }
  }

  animTeardown = () => {
    tornDown = true;
    removeHover?.();
    scrollTrigger?.kill();
    timeline?.kill();
    gsap.killTweensOf(targets);
  };
};

onUnmounted(() => {
  animTeardown?.();
  animTeardown = null;
});

watch(
  () => [
    box.value,
    dash.value,
    props.drawDuration,
    props.fillDelay,
    props.delay,
    props.stagger,
    props.ease,
    props.trigger,
    props.fillMode,
    props.strokeFade,
    props.sheen,
    props.reverse
  ],
  () => {
    animTeardown?.();
    animTeardown = null;
    setupAnimation();
  },
  { flush: 'post' }
);
</script>

<template>
  <span
    ref="rootRef"
    class="block w-full leading-0"
    :class="[trigger === 'hover' ? 'cursor-pointer' : '', className]"
    :style="style"
    role="img"
    :aria-label="String(text ?? '')"
  >
    <!-- Hidden until measured, so the unanimated text never flashes before the draw starts -->
    <svg
      ref="svgRef"
      class="block w-full will-change-transform"
      :class="box ? '' : 'invisible'"
      :style="{ height: `${Math.round(fontSize * 1.3)}px` }"
      :viewBox="viewBox"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      <defs v-if="box">
        <!-- Mask luminance, not a visible color: white shows the fill, black hides it -->
        <linearGradient v-if="fillMode === 'wipe'" :id="wipeGradId" x1="0" y1="0" x2="1" y2="0">
          <stop :offset="wipeSolidStop" stop-color="white" />
          <stop offset="1" stop-color="black" />
        </linearGradient>
        <mask
          v-if="fillMode === 'wipe'"
          :id="wipeId"
          maskUnits="userSpaceOnUse"
          :x="box.x"
          :y="box.y"
          :width="box.width"
          :height="box.height"
        >
          <rect
            ref="wipeRectRef"
            :x="wipeStartX"
            :y="box.y"
            :width="box.width + feather"
            :height="box.height"
            :fill="`url(#${wipeGradId})`"
          />
        </mask>
        <linearGradient
          v-if="sheen"
          :id="sheenId"
          ref="sheenGradRef"
          gradientUnits="userSpaceOnUse"
          :x1="box.x - sheenBand * 2"
          :x2="box.x - sheenBand"
          y1="0"
          y2="0"
        >
          <stop offset="0" :style="{ stopColor: sheenColor }" stop-opacity="0" />
          <stop offset="0.5" :style="{ stopColor: sheenColor }" />
          <stop offset="1" :style="{ stopColor: sheenColor }" stop-opacity="0" />
        </linearGradient>
      </defs>

      <text
        ref="strokeTextRef"
        class="select-none"
        x="0"
        y="0"
        fill="none"
        text-rendering="geometricPrecision"
        :stroke-width="strokeWidth"
        stroke-linejoin="round"
        stroke-linecap="round"
        :style="strokeStyle"
      >
        <tspan v-for="(char, index) in characters" data-stroke-char :key="`s-${index}`">{{ char }}</tspan>
      </text>

      <text
        class="select-none"
        x="0"
        y="0"
        text-rendering="geometricPrecision"
        stroke="none"
        :style="fillStyle"
        :mask="fillMode === 'wipe' && box ? `url(#${wipeId})` : undefined"
      >
        <tspan v-for="(char, index) in characters" data-fill-char :key="`f-${index}`">{{ char }}</tspan>
      </text>

      <!-- Same glyphs filled with the moving sheen gradient; transparent outside the band -->
      <text
        v-if="sheen && fillMode !== 'none' && box"
        class="pointer-events-none select-none"
        x="0"
        y="0"
        text-rendering="geometricPrecision"
        :fill="`url(#${sheenId})`"
        stroke="none"
        :style="fontStyle"
      >
        <tspan v-for="(char, index) in characters" :key="`h-${index}`">{{ char }}</tspan>
      </text>
    </svg>
  </span>
</template>
