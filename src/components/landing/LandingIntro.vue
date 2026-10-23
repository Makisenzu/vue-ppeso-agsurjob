<script setup lang="ts">
import ElectricLogo from '@/components/ElectricLogo.vue'
import PixelSwap from '@/components/PixelSwap.vue'
import StrokeText from '@/components/StrokeText.vue'
import { useLandingIntro } from '@/composables/landing/useLandingIntro'
import agsurSeal from '@/assets/images/agsur.png'

const {
  introText,
  introTextTiming,
  swapDurationMs,
  isIntroVisible,
  isBackgroundSwapped,
  fontSize,
  letterSpacing,
  electric,
} = useLandingIntro()
</script>

<template>
  <Transition
    leave-active-class="transition-[opacity,transform,filter] duration-600 ease-in"
    leave-to-class="scale-105 opacity-0 blur-sm"
  >
    <!-- Seal lands at ~0.9s while its electric outline charges up over ~1.4s. From 0.5s the text draws; at ~0.7s the
         inverted background starts pixel-swapping to the page background (strands flip at ~1.4s) and lands with the
         text fill at ~2.1s, then it holds until the 3.2s exit -->
    <div
      v-if="isIntroVisible"
      class="fixed inset-0 z-100 flex items-center justify-center bg-background px-4 sm:px-6 lg:px-8"
    >
      <p class="sr-only">{{ introText }}</p>

      <PixelSwap
        class-name="absolute! inset-0 size-full"
        aspect-ratio="auto"
        trigger="manual"
        :active="isBackgroundSwapped"
        :pixel-size="64"
        :gap="0"
        :pixel-radius="0"
        :pixel-spin="0"
        :pixel-scale="0.35"
        :duration="swapDurationMs"
        :pixel-duration="450"
        pattern="random"
        :randomness="0"
        fade
        aria-hidden="true"
      >
        <!-- Opens inverted (black in light mode, white in dark mode) and swaps to the plain page background,
             so the exit hands off seamlessly -->
        <template #first>
          <div class="size-full bg-foreground" />
        </template>
        <template #second>
          <div class="size-full bg-background" />
        </template>
      </PixelSwap>

      <!-- Relative so the content paints above the absolutely positioned background -->
      <div class="relative flex w-full flex-col items-center gap-6 sm:gap-8">
        <div class="relative flex items-center justify-center" aria-hidden="true">
          <div class="relative size-24 animate-intro-seal-in sm:size-32 lg:size-40">
            <img :src="agsurSeal" alt="" class="size-full object-contain" />
            <!-- The glow spreads ~70% of the seal's size past its edge, so the canvas overhangs the seal by a full seal
                 per side (3x box, seal at ~1/3 scale) and fades out radially; a tighter box clips the glow into a visible square -->
            <ElectricLogo
              class-name="pointer-events-none absolute! -inset-full size-auto! [mask-image:radial-gradient(closest-side,black_60%,transparent)]"
              :src="agsurSeal"
              :color="electric.color"
              :glow-color="electric.glowColor"
              :theme="electric.theme"
              :interactive="false"
              :scale="0.336"
              :speed="2"
            />
          </div>
        </div>

        <!-- Drawn in the invert color with mix-blend-difference, so each letter shows as the opposite of the tile
             behind it and flips as the pixels swap, ending dark on light (light mode) or light on dark (dark mode).
             No sheen: a colored band would come out as its inverse -->
        <div class="w-full max-w-5xl mix-blend-difference" aria-hidden="true">
          <StrokeText
            :text="introText"
            stroke-color="var(--invert)"
            fill-color="var(--invert)"
            :sheen="false"
            :font-size="fontSize"
            :letter-spacing="letterSpacing"
            :delay="introTextTiming.delay"
            :draw-duration="introTextTiming.drawDuration"
            :stagger="introTextTiming.stagger"
            :fill-delay="introTextTiming.fillDelay"
          />
        </div>

        <div class="h-0.5 w-40 overflow-hidden rounded-full bg-invert/20 mix-blend-difference sm:w-56" aria-hidden="true">
          <div class="h-full w-full origin-left animate-intro-progress rounded-full bg-invert" />
        </div>
      </div>
    </div>
  </Transition>
</template>
