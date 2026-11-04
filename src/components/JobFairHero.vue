<script setup lang="ts">
/** Full-bleed hero of the applicant / employer job fair pages, the same band as the GIP / SPES / TUPAD heroes */
defineProps<{
  eyebrow: string
  title: string
  description?: string | null
  backgroundImage?: string | null
}>()
</script>

<template>
  <section aria-labelledby="job-fair-hero-title" class="relative isolate w-full overflow-hidden bg-muted">
    <template v-if="backgroundImage">
      <img :src="backgroundImage" alt="" fetchpriority="high" class="absolute inset-0 -z-10 size-full object-cover" />
      <div class="absolute inset-0 -z-10 bg-background/80 md:bg-transparent md:bg-linear-to-r md:from-background md:via-background/80 md:to-background/10" />
    </template>

    <!-- The optional #aside (the job fair's map) sits on the right, vertically centered -->
    <div
      class="mx-auto grid min-h-[18rem] max-w-7xl items-center gap-8 px-4 py-14 sm:min-h-[22rem] sm:px-6 sm:py-16 lg:min-h-[24rem] lg:px-8"
      :class="$slots.aside ? 'lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] lg:gap-12' : ''"
    >
      <div class="flex max-w-2xl min-w-0 flex-col gap-4">
        <p class="text-sm font-semibold tracking-wide text-primary uppercase">{{ eyebrow }}</p>
        <h1 id="job-fair-hero-title" class="text-4xl leading-tight font-extrabold tracking-tight text-balance text-foreground sm:text-5xl lg:text-6xl">
          {{ title }}
        </h1>
        <p v-if="description" class="text-base text-pretty text-muted-foreground sm:text-lg">{{ description }}</p>
        <slot />
      </div>
      <div v-if="$slots.aside" class="min-w-0">
        <slot name="aside" />
      </div>
    </div>
  </section>
</template>
