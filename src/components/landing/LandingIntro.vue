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
         pixel background starts swapping in random order and lands with the text fill at ~2.1s, then the green sheen runs by ~2.8s, before the 3.2s exit -->
    <div
      v-if="isIntroVisible"
      class="fixed inset-0 z-100 flex items-center justify-center bg-background px-4 text-primary sm:px-6 lg:px-8"
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
        <template #first>
          <div class="size-full bg-background" />
        </template>
        <template #second>
          <div class="size-full bg-background bg-radial-[at_50%_42%] from-primary/45 via-primary/20 to-primary/10" />
        </template>
      </PixelSwap>

      <!-- Relative so the content paints above the absolutely positioned background -->
      <div class="relative flex w-full flex-col items-center gap-6 sm:gap-8">
        <div class="relative flex items-center justify-center" aria-hidden="true">
          <div class="relative size-24 animate-intro-seal-in sm:size-32 lg:size-40">
            <img :src="agsurSeal" alt="" class="size-full object-contain" />
            <!-- ElectricLogo fits the traced seal to 70% of its box, so the box overhangs the seal by 22% per side to line the strands up with its edge -->
            <ElectricLogo
              class-name="pointer-events-none absolute! -inset-[22%] size-auto!"
              :src="agsurSeal"
              :color="electric.color"
              :glow-color="electric.glowColor"
              :theme="electric.theme"
              :interactive="false"
              :scale="0.7"
              :speed="2"
            />
          </div>
        </div>

        <div class="w-full max-w-5xl" aria-hidden="true">
          <StrokeText
            :text="introText"
            stroke-color="var(--foreground)"
            fill-color="var(--foreground)"
            sheen-color="var(--primary)"
            :font-size="fontSize"
            :letter-spacing="letterSpacing"
            :delay="introTextTiming.delay"
            :draw-duration="introTextTiming.drawDuration"
            :stagger="introTextTiming.stagger"
            :fill-delay="introTextTiming.fillDelay"
          />
        </div>

        <div class="h-0.5 w-40 overflow-hidden rounded-full bg-primary/15 sm:w-56" aria-hidden="true">
          <div class="h-full w-full origin-left animate-intro-progress rounded-full bg-primary" />
        </div>
      </div>
    </div>
  </Transition>
</template>
