<script setup lang="ts">
import InfiniteSpiral from '@/components/InfiniteSpiral.vue'
import { useLandingMunicipalities } from '@/composables/landing/useLandingMunicipalities'

const { titleLead, titleAccent, description, municipalities, spiralItems } = useLandingMunicipalities()
</script>

<template>
  <section id="municipalities" aria-labelledby="municipalities-title" class="scroll-mt-16 bg-background">
    <div class="mx-auto grid max-w-7xl items-center gap-10 px-4 pb-16 sm:px-6 sm:pb-20 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:pb-24">
      <div class="flex flex-col gap-6">
        <!-- Same two-line title as the about section, its second line in Times New Roman (DESIGN.md exception) -->
        <h2 id="municipalities-title" class="text-4xl leading-tight font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
          {{ titleLead }}
          <span class="block font-['Times_New_Roman',Times,serif] font-normal tracking-normal text-primary italic">
            {{ titleAccent }}
          </span>
        </h2>

        <p class="text-base text-pretty text-muted-foreground sm:text-lg">{{ description }}</p>

        <!-- The names as text too: the spiral only shows a few logos at a time -->
        <ul class="grid grid-cols-2 gap-x-6 gap-y-2 border-l-2 border-border pl-6 text-sm sm:grid-cols-3 sm:text-base">
          <li v-for="municipality in municipalities" :key="municipality.key" class="text-foreground">
            {{ municipality.name }}
            <span v-if="municipality.isCity" class="text-xs font-medium text-primary uppercase">City</span>
          </li>
        </ul>
      </div>

      <!-- Circular cards with the whole logo showing (contain); the list above carries the names -->
      <InfiniteSpiral
        :items="spiralItems"
        :card-width="110"
        :card-height="110"
        :card-radius="55"
        image-fit="contain"
        :radius="170"
        :vertical-spacing="60"
        :cards-per-turn="7"
        :speed="0.45"
        class-name="h-96! lg:h-[34rem]!"
        aria-hidden="true"
      />
    </div>
  </section>
</template>
