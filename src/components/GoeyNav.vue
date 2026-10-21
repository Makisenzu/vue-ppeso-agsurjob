<template>
  <div class="gooey-nav">
    <div class="relative" ref="containerRef">
      <nav class="flex relative" :aria-label="ariaLabel" :style="{ transform: 'translate3d(0,0,0.01px)' }">
        <ul
          ref="navRef"
          :class="['flex list-none p-0 m-0 relative z-[3] text-foreground', listClass]"
        >
          <li
            v-for="(item, index) in items"
            :key="item.label"
            :class="[
              'rounded-full relative cursor-pointer transition-[background-color_color_box-shadow] duration-300 ease shadow-[0_0_0.5px_1.5px_transparent]',
              { active: current === index }
            ]"
          >
            <!-- Dropdown items activate on open; closing without a selection restores the previous item -->
            <DropdownMenu v-if="item.children" :modal="false" @update:open="open => handleDropdownOpen(open, index)">
              <DropdownMenuTrigger :class="[linkClass, 'group inline-flex items-center gap-1']">
                <span>{{ item.label }}</span>
                <ChevronDown class="size-4 transition-transform group-data-[state=open]:rotate-180" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" class="w-56">
                <template v-for="child in item.children" :key="child.label">
                  <DropdownMenuItem v-if="child.to" as-child @select="markChildSelected">
                    <RouterLink :to="child.to" exact-active-class="bg-accent text-accent-foreground">
                      {{ child.label }}
                    </RouterLink>
                  </DropdownMenuItem>
                  <DropdownMenuItem v-else-if="child.href" as-child @select="markChildSelected">
                    <a :href="child.href">{{ child.label }}</a>
                  </DropdownMenuItem>
                  <DropdownMenuItem v-else disabled>
                    {{ child.label }}
                    <span class="ml-auto text-xs text-muted-foreground">Coming soon</span>
                  </DropdownMenuItem>
                </template>
              </DropdownMenuContent>
            </DropdownMenu>
            <RouterLink v-else-if="item.to" :to="item.to" :class="linkClass" @click="activate(index)">
              <span>{{ item.label }}</span>
            </RouterLink>
            <a
              v-else
              :href="item.href || undefined"
              :tabindex="item.href ? undefined : 0"
              :class="linkClass"
              @click="activate(index)"
              @keydown="e => handleKeyDown(e, item, index)"
            >
              <span>{{ item.label }}</span>
            </a>
          </li>
        </ul>
      </nav>

      <span class="effect filter" ref="filterRef" />

      <span class="effect text" ref="textRef" aria-hidden="true" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, useTemplateRef } from 'vue';
import { RouterLink } from 'vue-router';
import type { RouteLocationRaw } from 'vue-router';
import { ChevronDown } from '@lucide/vue';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

interface GooeyNavChild {
  label: string;
  /** Neither `to` nor `href`: the child renders disabled as "Coming soon" */
  to?: RouteLocationRaw;
  href?: string | null;
}

interface GooeyNavItem {
  label: string;
  href?: string | null;
  /** Router navigation instead of a plain link */
  to?: RouteLocationRaw;
  /** Renders the item as a dropdown trigger */
  children?: GooeyNavChild[];
}

interface GooeyNavProps {
  items: GooeyNavItem[];
  animationTime?: number;
  particleCount?: number;
  particleDistances?: [number, number];
  particleR?: number;
  timeVariance?: number;
  colors?: number[];
  initialActiveIndex?: number;
  /** Controlled active item (e.g. derived from the current route); -1 hides the effect */
  activeIndex?: number;
  listClass?: string;
  ariaLabel?: string;
}

const props = withDefaults(defineProps<GooeyNavProps>(), {
  animationTime: 600,
  particleCount: 15,
  particleDistances: () => [90, 10],
  particleR: 100,
  timeVariance: 300,
  colors: () => [1, 2, 3, 1, 2, 3, 1, 4],
  initialActiveIndex: 0,
  activeIndex: undefined,
  listClass: 'gap-8 px-4',
  ariaLabel: undefined
});

const linkClass =
  'outline-none py-[0.6em] px-[1em] inline-block rounded-full focus-visible:ring-2 focus-visible:ring-ring';

const containerRef = useTemplateRef<HTMLDivElement>('containerRef');
const navRef = useTemplateRef<HTMLUListElement>('navRef');
const filterRef = useTemplateRef<HTMLSpanElement>('filterRef');
const textRef = useTemplateRef<HTMLSpanElement>('textRef');
const current = ref<number>(props.activeIndex ?? props.initialActiveIndex);

let resizeObserver: ResizeObserver | null = null;

const noise = (n = 1) => n / 2 - Math.random() * n;

const getXY = (distance: number, pointIndex: number, totalPoints: number): [number, number] => {
  const angle = ((360 + noise(8)) / totalPoints) * pointIndex * (Math.PI / 180);
  return [distance * Math.cos(angle), distance * Math.sin(angle)];
};

const createParticle = (i: number, t: number, d: [number, number], r: number) => {
  const rotate = noise(r / 10);
  return {
    start: getXY(d[0], props.particleCount - i, props.particleCount),
    end: getXY(d[1] + noise(7), props.particleCount - i, props.particleCount),
    time: t,
    scale: 1 + noise(0.2),
    color: props.colors[Math.floor(Math.random() * props.colors.length)],
    rotate: rotate > 0 ? (rotate + r / 20) * 10 : (rotate - r / 20) * 10
  };
};

const makeParticles = (element: HTMLElement) => {
  const d: [number, number] = props.particleDistances;
  const r = props.particleR;
  const bubbleTime = props.animationTime * 2 + props.timeVariance;
  element.style.setProperty('--time', `${bubbleTime}ms`);
  for (let i = 0; i < props.particleCount; i++) {
    const t = props.animationTime * 2 + noise(props.timeVariance * 2);
    const p = createParticle(i, t, d, r);
    element.classList.remove('active');
    setTimeout(() => {
      const particle = document.createElement('span');
      const point = document.createElement('span');
      particle.classList.add('particle');
      particle.style.setProperty('--start-x', `${p.start[0]}px`);
      particle.style.setProperty('--start-y', `${p.start[1]}px`);
      particle.style.setProperty('--end-x', `${p.end[0]}px`);
      particle.style.setProperty('--end-y', `${p.end[1]}px`);
      particle.style.setProperty('--time', `${p.time}ms`);
      particle.style.setProperty('--scale', `${p.scale}`);
      particle.style.setProperty('--color', `var(--color-${p.color}, white)`);
      particle.style.setProperty('--rotate', `${p.rotate}deg`);
      point.classList.add('point');
      particle.appendChild(point);
      element.appendChild(particle);
      requestAnimationFrame(() => {
        element.classList.add('active');
      });
      setTimeout(() => {
        try {
          element.removeChild(particle);
        } catch {}
      }, t);
    }, 30);
  }
};

const getItemElement = (index: number) =>
  navRef.value?.querySelectorAll<HTMLElement>(':scope > li')[index];

const toRelativeRect = (element: HTMLElement, containerRect: DOMRect) => {
  const pos = element.getBoundingClientRect();
  return {
    left: `${pos.x - containerRect.x}px`,
    top: `${pos.y - containerRect.y}px`,
    width: `${pos.width}px`,
    height: `${pos.height}px`
  };
};

const updateEffectPosition = (element: HTMLElement) => {
  if (!containerRef.value || !filterRef.value || !textRef.value) return;
  const containerRect = containerRef.value.getBoundingClientRect();
  // The overlay mirrors the link/trigger content (label + chevron); the item's own content is hidden
  // while active, so only one copy renders and there's no ghosting from sub-pixel misalignment
  const content = (element.firstElementChild as HTMLElement | null) ?? element;
  Object.assign(filterRef.value.style, toRelativeRect(element, containerRect));
  Object.assign(textRef.value.style, toRelativeRect(content, containerRect));
  textRef.value.style.columnGap = getComputedStyle(content).columnGap;
  textRef.value.replaceChildren(...Array.from(content.childNodes, node => node.cloneNode(true)));
};

const clearEffect = () => {
  filterRef.value?.querySelectorAll('.particle').forEach(p => p.remove());
  filterRef.value?.classList.remove('active');
  if (textRef.value) {
    textRef.value.classList.remove('active');
    textRef.value.replaceChildren();
  }
};

const activate = (index: number) => {
  if (current.value === index) return;
  current.value = index;
  const liEl = getItemElement(index);
  if (!liEl) {
    clearEffect();
    return;
  }
  updateEffectPosition(liEl);
  if (filterRef.value) {
    const particles = filterRef.value.querySelectorAll('.particle');
    particles.forEach(p => filterRef.value!.removeChild(p));
  }
  if (textRef.value) {
    textRef.value.classList.remove('active');
    void textRef.value.offsetWidth;
    textRef.value.classList.add('active');
  }
  if (filterRef.value) {
    makeParticles(filterRef.value);
  }
};

// Dropdown state: the item to fall back to if a menu closes without a selection
let restoreIndex: number | null = null;
let openIndex: number | null = null;
let childSelected = false;

const markChildSelected = () => {
  childSelected = true;
};

const handleDropdownOpen = (open: boolean, index: number) => {
  if (open) {
    openIndex = index;
    restoreIndex ??= current.value;
    activate(index);
    return;
  }
  if (openIndex === index) openIndex = null;
  if (childSelected) {
    // The selected child's route takes over through activeIndex
    childSelected = false;
    restoreIndex = null;
    return;
  }
  // Deferred so switching straight to another dropdown doesn't bounce the pill back first
  setTimeout(() => {
    if (openIndex !== null || restoreIndex === null) return;
    const target = props.activeIndex ?? restoreIndex;
    restoreIndex = null;
    activate(target);
  });
};

// Links with an href already activate on Enter through their click event
const handleKeyDown = (e: KeyboardEvent, item: GooeyNavItem, index: number) => {
  if (item.href) return;
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    activate(index);
  }
};

watch(
  () => props.activeIndex,
  index => {
    if (index !== undefined) activate(index);
  }
);

onMounted(() => {
  if (!navRef.value || !containerRef.value) return;
  const activeLi = getItemElement(current.value);
  if (activeLi) {
    updateEffectPosition(activeLi);
    textRef.value?.classList.add('active');
  }
  resizeObserver = new ResizeObserver(() => {
    const currentActiveLi = getItemElement(current.value);
    if (currentActiveLi) {
      updateEffectPosition(currentActiveLi);
    }
  });
  resizeObserver.observe(containerRef.value);
});

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
  }
});
</script>

<style>
:root {
  --linear-ease: linear(
    0,
    0.068,
    0.19 2.7%,
    0.804 8.1%,
    1.037,
    1.199 13.2%,
    1.245,
    1.27 15.8%,
    1.274,
    1.272 17.4%,
    1.249 19.1%,
    0.996 28%,
    0.949,
    0.928 33.3%,
    0.926,
    0.933 36.8%,
    1.001 45.6%,
    1.013,
    1.019 50.8%,
    1.018 54.4%,
    1 63.1%,
    0.995 68%,
    1.001 85%,
    1
  );
}

/* Particle colors mapped to design tokens */
.gooey-nav {
  --color-1: var(--primary);
  --color-2: var(--success);
  --color-3: var(--info);
  --color-4: var(--warning);
}

.gooey-nav .effect {
  position: absolute;
  opacity: 1;
  pointer-events: none;
  display: grid;
  place-items: center;
  z-index: 1;
}

.gooey-nav .effect.text {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--foreground);
  transition: color 0.3s ease;
}

.gooey-nav .effect.text.active {
  color: var(--background);
}

/*
 * The gooey blob relies on blur + contrast over a pure black/white canvas, so these
 * two values must stay absolute. Light mode inverts the canvas and blends with darken;
 * dark mode keeps the original black canvas with lighten.
 */
.gooey-nav .effect.filter {
  filter: blur(7px) contrast(100) blur(0);
  mix-blend-mode: darken;
}

.dark .gooey-nav .effect.filter {
  mix-blend-mode: lighten;
}

.gooey-nav .effect.filter::before {
  content: '';
  position: absolute;
  inset: -75px;
  z-index: -2;
  background: white;
}

.dark .gooey-nav .effect.filter::before {
  background: black;
}

.gooey-nav .effect.filter::after {
  content: '';
  position: absolute;
  inset: 0;
  background: black;
  transform: scale(0);
  opacity: 0;
  z-index: -1;
  border-radius: 9999px;
}

.dark .gooey-nav .effect.filter::after {
  background: white;
}

.gooey-nav .effect.active::after {
  animation: pill 0.3s ease both;
}

@keyframes pill {
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.gooey-nav .particle,
.gooey-nav .point {
  display: block;
  opacity: 0;
  width: 20px;
  height: 20px;
  border-radius: 9999px;
  transform-origin: center;
}

.gooey-nav .particle {
  --time: 5s;
  position: absolute;
  top: calc(50% - 8px);
  left: calc(50% - 8px);
  animation: particle calc(var(--time)) ease 1 -350ms;
}

.gooey-nav .point {
  background: var(--color);
  opacity: 1;
  animation: point calc(var(--time)) ease 1 -350ms;
}

@keyframes particle {
  0% {
    transform: rotate(0deg) translate(calc(var(--start-x)), calc(var(--start-y)));
    opacity: 1;
    animation-timing-function: cubic-bezier(0.55, 0, 1, 0.45);
  }
  70% {
    transform: rotate(calc(var(--rotate) * 0.5)) translate(calc(var(--end-x) * 1.2), calc(var(--end-y) * 1.2));
    opacity: 1;
    animation-timing-function: ease;
  }
  85% {
    transform: rotate(calc(var(--rotate) * 0.66)) translate(calc(var(--end-x)), calc(var(--end-y)));
    opacity: 1;
  }
  100% {
    transform: rotate(calc(var(--rotate) * 1.2)) translate(calc(var(--end-x) * 0.5), calc(var(--end-y) * 0.5));
    opacity: 1;
  }
}

@keyframes point {
  0% {
    transform: scale(0);
    opacity: 0;
    animation-timing-function: cubic-bezier(0.55, 0, 1, 0.45);
  }
  25% {
    transform: scale(calc(var(--scale) * 0.25));
  }
  38% {
    opacity: 1;
  }
  65% {
    transform: scale(var(--scale));
    opacity: 1;
    animation-timing-function: ease;
  }
  85% {
    transform: scale(var(--scale));
    opacity: 1;
  }
  100% {
    transform: scale(0);
    opacity: 0;
  }
}

.gooey-nav li.active {
  color: var(--background);
  text-shadow: none;
}

/* The .effect.text overlay draws the active item's content; hiding the original avoids a doubled label */
.gooey-nav li.active > * {
  color: transparent;
}

.gooey-nav li.active::after {
  opacity: 1;
  transform: scale(1);
}

.gooey-nav li::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 8px;
  background: var(--foreground);
  opacity: 0;
  transform: scale(0);
  transition: all 0.3s ease;
  z-index: -1;
}
</style>
