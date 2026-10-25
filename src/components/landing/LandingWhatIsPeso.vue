<script setup lang="ts">
import { useLandingWhatIsPeso } from '@/composables/landing/useLandingWhatIsPeso'

const { title, definition, purpose, laws, services } = useLandingWhatIsPeso()
</script>

<template>
  <section id="what-is-peso" aria-labelledby="what-is-peso-title" class="scroll-mt-16 bg-background">
    <div class="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[2fr_3fr] lg:gap-16 lg:px-8 lg:py-24">
      <!-- Definition stays in view beside the services on desktop -->
      <div class="flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start">
        <!-- Same Times New Roman treatment as the other landing headings (DESIGN.md exception) -->
        <h1
          id="what-is-peso-title"
          class="font-['Times_New_Roman',Times,serif] text-2xl font-bold tracking-[0.15em] text-foreground uppercase sm:text-3xl lg:text-4xl lg:tracking-[0.2em]"
        >
          {{ title }}
        </h1>

        <p class="text-base text-pretty text-foreground sm:text-lg">{{ definition }}</p>
        <p class="text-base text-pretty text-muted-foreground sm:text-lg">{{ purpose }}</p>

        <dl class="flex flex-wrap gap-x-8 gap-y-3 border-t border-border pt-6">
          <div v-for="law in laws" :key="law.code" class="flex flex-col">
            <dt class="text-sm font-semibold text-primary">{{ law.code }}</dt>
            <dd class="text-sm text-muted-foreground">{{ law.title }}</dd>
          </div>
        </dl>
      </div>

      <!-- Numbered rows instead of icon cards: the order reads as the path an applicant takes -->
      <ol class="flex flex-col" aria-label="PESO services">
        <li
          v-for="(service, index) in services"
          :key="service.name"
          class="grid grid-cols-[2.5rem_1fr] gap-x-4 border-t border-border py-6 last:border-b sm:grid-cols-[3rem_1fr]"
        >
          <span class="text-sm font-semibold text-muted-foreground tabular-nums" aria-hidden="true">
            {{ String(index + 1).padStart(2, '0') }}
          </span>
          <div class="flex flex-col gap-1">
            <h2 class="text-base font-semibold text-foreground sm:text-lg">{{ service.name }}</h2>
            <p class="text-sm text-pretty text-muted-foreground sm:text-base">{{ service.description }}</p>
          </div>
        </li>
      </ol>
    </div>
  </section>
</template>
