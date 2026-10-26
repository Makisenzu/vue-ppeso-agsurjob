<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { useLandingGip } from '@/composables/landing/useLandingGip'

const { hero, about, facts, requirements, cta, isLoading } = useLandingGip()
</script>

<template>
  <!-- Single root: App.vue's out-in <transition> needs one -->
  <div>
    <!-- ─── Hero: full-bleed band like the public page heroes (LandingPageHero.vue) ─── -->
    <section aria-labelledby="gip-hero-title" class="relative isolate w-full overflow-hidden bg-muted">
      <template v-if="hero.backgroundImage">
        <img :src="hero.backgroundImage" alt="" fetchpriority="high" class="absolute inset-0 -z-10 size-full object-cover" />
        <div class="absolute inset-0 -z-10 bg-background/80 md:bg-transparent md:bg-linear-to-r md:from-background md:via-background/80 md:to-background/10" />
      </template>

      <div class="mx-auto flex min-h-[18rem] max-w-7xl items-center px-4 py-14 sm:min-h-[22rem] sm:px-6 sm:py-16 lg:min-h-[24rem] lg:px-8">
        <div class="flex max-w-2xl flex-col gap-4">
          <p class="text-sm font-semibold tracking-wide text-primary uppercase">{{ hero.eyebrow }}</p>
          <h1 id="gip-hero-title" class="text-4xl leading-tight font-extrabold tracking-tight text-balance text-foreground sm:text-5xl lg:text-6xl">
            {{ hero.title }}
          </h1>
          <p class="text-base text-pretty text-muted-foreground sm:text-lg">{{ hero.description }}</p>
        </div>
      </div>
    </section>

    <div class="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[2fr_3fr] lg:gap-16 lg:px-8 lg:py-24">
      <!-- ─── What is GIP? (stays in view beside the requirements on desktop) ─── -->
      <section aria-labelledby="what-is-gip-title" class="flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start">
        <!-- Same Times New Roman treatment as the other landing headings (DESIGN.md exception) -->
        <h2
          id="what-is-gip-title"
          class="font-['Times_New_Roman',Times,serif] text-2xl font-bold tracking-[0.15em] text-foreground uppercase sm:text-3xl lg:tracking-[0.2em]"
        >
          {{ about.title }}
        </h2>
        <p class="text-base text-pretty text-foreground sm:text-lg">{{ about.definition }}</p>
        <p class="text-base text-pretty text-muted-foreground sm:text-lg">{{ about.purpose }}</p>

        <dl class="flex flex-wrap gap-x-8 gap-y-3 border-t border-border pt-6">
          <div v-for="fact in facts" :key="fact.label" class="flex flex-col">
            <dt class="text-sm font-semibold text-primary">{{ fact.label }}</dt>
            <dd class="text-sm text-muted-foreground">{{ fact.value }}</dd>
          </div>
        </dl>
      </section>

      <!-- ─── Requirements: numbered rows, like the PESO services on What is PESO? ─── -->
      <section id="gip-requirements" aria-labelledby="gip-requirements-title" class="flex scroll-mt-20 flex-col gap-6">
        <div class="flex flex-col gap-2">
          <h2
            id="gip-requirements-title"
            class="font-['Times_New_Roman',Times,serif] text-2xl font-bold tracking-[0.15em] text-foreground uppercase sm:text-3xl lg:tracking-[0.2em]"
          >
            Requirements
          </h2>
          <p class="text-sm text-pretty text-muted-foreground sm:text-base">
            Every requirement is submitted as a PDF. Your NSRP Form 1 is generated from your profile when you apply;
            prepare a PDF copy of each of the other requirements.
          </p>
        </div>

        <ol class="flex flex-col" aria-label="GIP requirements">
          <li
            v-for="(doc, index) in requirements"
            :key="doc.name"
            class="grid grid-cols-[2.5rem_1fr] gap-x-4 border-t border-border py-5 last:border-b sm:grid-cols-[3rem_1fr]"
          >
            <span class="pt-0.5 text-sm font-semibold text-muted-foreground tabular-nums" aria-hidden="true">
              {{ String(index + 1).padStart(2, '0') }}
            </span>
            <div class="flex flex-col">
              <span class="text-base font-semibold text-foreground sm:text-lg">
                {{ doc.name }}
                <span v-if="doc.isOptional" class="text-sm font-normal text-muted-foreground">(optional)</span>
              </span>
              <span v-if="doc.note" class="text-sm text-muted-foreground">{{ doc.note }}</span>
            </div>
          </li>
        </ol>

        <!-- ─── Call to action ─── -->
        <div v-if="cta === 'login'" class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p class="text-sm text-muted-foreground">Log in to apply. New here? Sign up for free.</p>
          <div class="flex flex-wrap gap-3">
            <Button as-child size="lg">
              <RouterLink :to="{ name: 'login' }">Log in to apply</RouterLink>
            </Button>
            <Button as-child size="lg" variant="outline">
              <RouterLink :to="{ name: 'signup' }">Sign up</RouterLink>
            </Button>
          </div>
        </div>
        <div v-else-if="cta === 'apply' && !isLoading" class="flex justify-end">
          <Button as-child size="lg" class="w-full sm:w-auto">
            <RouterLink :to="{ name: 'gip-application-form' }">Apply now</RouterLink>
          </Button>
        </div>
        <div v-else-if="cta === 'applied' && !isLoading" class="flex justify-end">
          <Button as-child size="lg" variant="outline" class="w-full sm:w-auto">
            <RouterLink :to="{ name: 'gip-application-form' }">View my application</RouterLink>
          </Button>
        </div>
      </section>
    </div>
  </div>
</template>
