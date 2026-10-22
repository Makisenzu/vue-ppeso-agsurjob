<script setup lang="ts">
import StrokeText from '@/components/StrokeText.vue'
import { useLandingIntro } from '@/composables/landing/useLandingIntro'

const { introLines, isIntroVisible, fontSize, letterSpacing } = useLandingIntro()
</script>

<template>
  <Transition leave-active-class="transition-opacity duration-500" leave-to-class="opacity-0">
    <!-- Drawing + fill finish at ~2.3s, so the text holds briefly before the 3s fade-out -->
    <div
      v-if="isIntroVisible"
      class="fixed inset-0 z-100 flex flex-col items-center justify-center bg-background px-4 text-primary sm:px-6 lg:px-8"
    >
      <p class="sr-only">{{ introLines.join(' ') }}</p>
      <div class="flex w-full max-w-5xl flex-col items-center" aria-hidden="true">
        <StrokeText
          v-for="line in introLines"
          :key="line"
          :text="line"
          stroke-color="currentColor"
          fill-color="currentColor"
          :font-size="fontSize"
          :letter-spacing="letterSpacing"
          :draw-duration="1.2"
          :stagger="0.03"
          :fill-delay="0.1"
        />
      </div>
    </div>
  </Transition>
</template>
