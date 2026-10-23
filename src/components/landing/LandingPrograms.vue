<script setup lang="ts">
import AccordionGallery from '@/components/AccordionGallery.vue'
import { useLandingPrograms } from '@/composables/landing/useLandingPrograms'

const { title, programs } = useLandingPrograms()
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

      <!-- AccordionGallery's own palette (white accent and text over a #060010 overlay), as tokens since the
           component mixes them with color-mix. Constant in both modes: the panels are always dark photos -->
      <AccordionGallery
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
