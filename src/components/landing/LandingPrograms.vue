<script setup lang="ts">
import AccordionGallery from '@/components/AccordionGallery.vue'
import DepthCarousel from '@/components/DepthCarousel.vue'
import { useLandingPrograms } from '@/composables/landing/useLandingPrograms'

const { title, programs, isPhone, activeProgram, onCarouselChange } = useLandingPrograms()
</script>

<template>
  <!-- #programs is the "PESO Programs" target in the header nav -->
  <section id="programs" aria-labelledby="programs-title" class="scroll-mt-16 bg-background">
    <div class="mx-auto flex max-w-7xl flex-col gap-10 px-4 pb-16 sm:px-6 sm:pb-20 lg:px-8 lg:pb-24">
      <!-- Same Times New Roman treatment as the office name (DESIGN.md exception) -->
      <h2
        id="programs-title"
        class="text-center font-['Times_New_Roman',Times,serif] text-2xl font-bold tracking-[0.15em] text-foreground uppercase sm:text-3xl lg:text-4xl lg:tracking-[0.2em]"
      >
        {{ title }}
      </h2>

      <!-- Phones: swipeable stack of cards, the front card's program captioned underneath -->
      <!-- -mt-12 and the shorter stage pull the cards up: they sit centered in the stage, leaving space above -->
      <div v-if="isPhone" class="-mt-12 flex flex-col items-center gap-4">
        <!-- Card stack dims with the same #060010 as the accordion overlay. Its dots sit at the bottom edge
             of the stage instead of 16px up, clear of the front card. The carousel scales its cards to its own
             width, so it spans the screen edge to edge (past the 1rem gutter) for wider cards -->
        <DepthCarousel
          :items="programs"
          :card-width="400"
          :card-height="300"
          :radius="16"
          tint="var(--media-overlay)"
          :depth="140"
          :spread="40"
          :tilt="22"
          :visible-cards="3"
          :blur="4"
          :show-controls="false"
          class="h-88 w-[calc(100%+2rem)]! [&>[role=tablist]]:bottom-0!"
          @change="onCarouselChange"
        />
        <p class="text-center" aria-live="polite">
          <span class="block text-lg font-semibold text-foreground">{{ activeProgram.label }}</span>
          <span class="block text-sm text-muted-foreground">{{ activeProgram.name }}</span>
        </p>
      </div>

      <!-- AccordionGallery's own palette (white accent and text over a #060010 overlay), as tokens since the
           component mixes them with color-mix. Constant in both modes: the panels are always dark photos -->
      <AccordionGallery
        v-else
        :items="programs"
        :default-index="0"
        accent-color="var(--on-media)"
        overlay-color="var(--media-overlay)"
        text-color="var(--on-media)"
        :height="460"
        :gap="10"
        :radius="16"
      />
    </div>
  </section>
</template>
