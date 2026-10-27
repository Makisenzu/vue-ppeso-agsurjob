<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import SplitText from '@/components/SplitText.vue'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel'
import { useLandingHero } from '@/composables/landing/useLandingHero'

const {
  officeName,
  isIntroDone,
  officeNameFrom,
  officeNameTo,
  officeNamePhase,
  officeWords,
  onOfficeNameShown,
  hoverWord,
  focusWord,
  isWordOpen,
  isSeparatorShown,
  officeNameSeparator,
  tapInitial,
  slides,
  isLoading,
  hasMultipleSlides,
  carouselOpts,
  selectedIndex,
  registerVideo,
  contentStyle,
  setApi,
  scrollTo,
  pauseAutoplay,
  resumeAutoplay,
} = useLandingHero()
</script>

<template>
  <!-- Full-bleed band; slide content stays aligned with the header's max-w-7xl container -->
  <section aria-label="Highlights" class="w-full bg-muted">
    <!-- Slides can be photo-only, so the page heading can't depend on a slide title -->
    <h1 class="sr-only">AGSURJOBS, the job portal of PESO Agusan del Sur</h1>
    <!-- Same footprint as a slide, so the page doesn't shift when the content arrives -->
    <div v-if="isLoading" class="mx-auto flex min-h-[26rem] max-w-7xl items-center px-4 pt-10 pb-20 sm:min-h-[30rem] sm:px-6 sm:pt-16 sm:pb-24 lg:min-h-[32rem] lg:px-8" aria-busy="true">
      <div class="flex w-full max-w-2xl flex-col gap-4">
        <Skeleton class="h-4 w-48" />
        <Skeleton class="h-12 w-full max-w-xl" />
        <Skeleton class="h-12 w-3/4 max-w-md" />
        <Skeleton class="h-5 w-full max-w-lg" />
        <div class="mt-2 flex gap-3">
          <Skeleton class="h-10 w-40" />
          <Skeleton class="h-10 w-36" />
        </div>
      </div>
    </div>
    <Carousel
      v-else
      :opts="carouselOpts"
      class="overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      @init-api="setApi"
      @mouseenter="pauseAutoplay"
      @mouseleave="resumeAutoplay"
      @focusin="pauseAutoplay"
      @focusout="resumeAutoplay"
    >
      <!-- Slides keep their own height (a media-only slide is as tall as its photo / video); the band follows the active one -->
      <CarouselContent class="ml-0 items-start transition-[height] duration-300 ease-out" :style="contentStyle">
        <CarouselItem
          v-for="(slide, index) in slides"
          :key="slide.id"
          :aria-label="`${index + 1} of ${slides.length}`"
          class="pl-0"
        >
          <div class="relative isolate">
            <!--
              With text, the uploaded photo / video fills the slide behind it, and a fade in the page color keeps the text readable.
              Without text, it is shown whole at its own proportions, so it shrinks with the screen instead of being cropped.
              Its height is capped at the text slides' height, so on wide screens it doesn't grow to fill the window
              (and loads eagerly: its height sets the band's height, so it can't wait until it's scrolled to).
            -->
            <template v-if="slide.backgroundImage">
              <!-- Silent looping background: no controls, playback is handled by useLandingHero -->
              <video
                v-if="slide.backgroundType === 'video'"
                :ref="registerVideo(index)"
                :src="slide.backgroundImage"
                :aria-label="slide.imageAlt || undefined"
                :aria-hidden="slide.imageAlt ? undefined : 'true'"
                :preload="index === 0 ? 'auto' : 'metadata'"
                muted
                loop
                playsinline
                disablepictureinpicture
                disableremoteplayback
                :class="slide.hasText ? 'absolute inset-0 -z-10 size-full object-cover' : 'block h-auto max-h-[26rem] w-full object-cover sm:max-h-[30rem] lg:max-h-[32rem]'"
              />
              <img
                v-else
                :src="slide.backgroundImage"
                :alt="slide.imageAlt"
                :loading="index === 0 || !slide.hasText ? 'eager' : 'lazy'"
                :fetchpriority="index === 0 ? 'high' : 'auto'"
                :class="slide.hasText ? 'absolute inset-0 -z-10 size-full object-cover' : 'block h-auto max-h-[26rem] w-full object-cover sm:max-h-[30rem] lg:max-h-[32rem]'"
              />
              <div v-if="slide.hasText" class="absolute inset-0 -z-10 bg-background/80 md:bg-transparent md:bg-linear-to-r md:from-background md:via-background/80 md:to-background/10" />
            </template>
            <!-- Soft bottom edge: the slide fades into the page instead of ending on a hard line -->
            <div class="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-linear-to-b from-transparent to-background" />

            <!-- Bottom padding leaves room for the controls floating over the slide -->
            <div v-if="slide.hasText || !slide.backgroundImage" class="mx-auto flex min-h-[26rem] max-w-7xl items-center px-4 pt-10 pb-20 sm:min-h-[30rem] sm:px-6 sm:pt-16 sm:pb-24 lg:min-h-[32rem] lg:px-8">
            <div v-if="slide.hasText" class="flex max-w-2xl flex-col gap-4">
              <p v-if="slide.eyebrow" class="text-sm font-semibold text-primary">{{ slide.eyebrow }}</p>
              <h2
                v-if="slide.title"
                class="max-w-2xl text-2xl font-bold tracking-tight text-balance text-foreground sm:text-4xl lg:text-5xl"
              >
                {{ slide.title }}
              </h2>
              <p v-if="slide.description" class="max-w-xl text-base text-pretty text-muted-foreground sm:text-lg">{{ slide.description }}</p>
              <div v-if="slide.primary || slide.secondary" class="mt-2 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Button v-if="slide.primary" size="lg" class="w-full sm:w-auto" as-child>
                  <AppLink v-if="slide.primary.to" :to="slide.primary.to">{{ slide.primary.label }}</AppLink>
                  <AppLink
                    v-else
                    :href="slide.primary.href"
                    :target="slide.primary.external ? '_blank' : undefined"
                  >{{ slide.primary.label }}</AppLink>
                </Button>
                <Button v-if="slide.secondary" size="lg" variant="outline" class="w-full sm:w-auto" as-child>
                  <AppLink v-if="slide.secondary.to" :to="slide.secondary.to">{{ slide.secondary.label }}</AppLink>
                  <AppLink
                    v-else
                    :href="slide.secondary.href"
                    :target="slide.secondary.external ? '_blank' : undefined"
                  >{{ slide.secondary.label }}</AppLink>
                </Button>
              </div>
            </div>
          </div>
          </div>
        </CarouselItem>
      </CarouselContent>

      <!-- Controls float over the slide's bottom edge so the photo covers the whole band -->
      <div v-if="hasMultipleSlides" class="absolute inset-x-0 bottom-0 mx-auto flex max-w-7xl items-center justify-center gap-4 px-4 pb-6 sm:justify-between sm:px-6 sm:pb-8 lg:px-8">
        <div class="flex items-center gap-2" aria-label="Choose slide">
          <button
            v-for="(slide, index) in slides"
            :key="slide.id"
            type="button"
            :aria-current="selectedIndex === index"
            :aria-label="`Go to slide ${index + 1}${slide.eyebrow || slide.title ? `: ${slide.eyebrow || slide.title}` : ''}`"
            :class="[
              'h-2 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              selectedIndex === index ? 'w-8 bg-primary' : 'w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50',
            ]"
            @click="scrollTo(index)"
          />
        </div>
        <!-- Phones swipe instead; the dots stay centered -->
        <div class="hidden items-center gap-2 sm:flex">
          <CarouselPrevious class="static translate-y-0" />
          <CarouselNext class="static translate-y-0" />
        </div>
      </div>
    </Carousel>

    <!-- Office name under the carousel. Times New Roman is a deliberate exception to DESIGN.md's Nunito-only rule, for
         this formal name only (a system font, nothing is imported); bold, since it has no heavier weight. Below sm the size
         follows the screen width (4.4vw fits down to 320px); tracking steps 0.08 / 0.15 / 0.2em so it is one line at every width,
         which the fold needs.
         1. reveal: SplitText brings the words in one every 1.5s. It animates once on mount, so it mounts when the intro
            lifts; until then an invisible copy holds the space.
         2. full: the same words, re-rendered as green initial + rest, so they can fold.
         3. merged: each rest (and the space after it) collapses, leaving PESO; hovering, focusing or tapping an initial
            unfolds its word in place (P -> Public ESO), one at a time. Merged, the line grows a step and the initials are
            spaced out as P . E . S . O (an unfolded word's dot folds away) -->
    <div class="bg-background px-4 pt-10 pb-4 sm:px-6 sm:pt-14 sm:pb-6 lg:px-8">
      <div class="mx-auto max-w-7xl text-center">
        <SplitText
          v-if="isIntroDone && officeNamePhase === 'reveal'"
          :text="officeName"
          tag="p"
          class-name="[&_.split-word]:first-letter:text-primary font-['Times_New_Roman',Times,serif] text-[4.4vw] font-bold tracking-[0.08em] text-balance max-sm:whitespace-nowrap! text-foreground sm:text-3xl sm:tracking-[0.15em] lg:text-4xl lg:tracking-[0.2em]"
          :delay="1500"
          :duration="0.8"
          ease="power3.out"
          split-type="words"
          :from="officeNameFrom"
          :to="officeNameTo"
          :threshold="0.1"
          root-margin="-100px"
          text-align="center"
          @animation-complete="onOfficeNameShown"
        />
        <p
          v-else-if="officeNamePhase !== 'reveal'"
          class="inline-flex font-['Times_New_Roman',Times,serif] font-bold tracking-[0.08em] whitespace-nowrap text-foreground transition-[font-size] duration-500 ease-in-out motion-reduce:transition-none sm:tracking-[0.15em] lg:tracking-[0.2em]"
          :class="officeNamePhase === 'merged' ? 'text-[6vw] sm:text-4xl lg:text-5xl' : 'text-[4.4vw] sm:text-3xl lg:text-4xl'"
        >
          <!-- Hover covers the whole word, so the pointer stays inside it as the unfolding word re-centers the line -->
          <span
            v-for="(item, index) in officeWords"
            :key="item.word"
            class="inline-flex"
            @pointerenter="(event: PointerEvent) => hoverWord(index, true, event)"
            @pointerleave="(event: PointerEvent) => hoverWord(index, false, event)"
          >
            <span
              :role="officeNamePhase === 'merged' ? 'button' : undefined"
              :tabindex="officeNamePhase === 'merged' ? 0 : -1"
              :aria-expanded="officeNamePhase === 'merged' ? isWordOpen(index) : undefined"
              :aria-label="officeNamePhase === 'merged' ? item.word : undefined"
              class="rounded-sm text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring"
              :class="officeNamePhase === 'merged' ? 'cursor-pointer' : ''"
              @focus="(event: FocusEvent) => focusWord(index, true, event)"
              @blur="(event: FocusEvent) => focusWord(index, false, event)"
              @pointerup="(event: PointerEvent) => tapInitial(index, event)"
            >{{ item.initial }}</span>
            <!-- Grid column 1fr <-> 0fr folds the rest to exactly zero width, whatever the word's length -->
            <!-- Hidden from screen readers: each initial is labelled with its whole word -->
            <span
              aria-hidden="true"
              class="inline-grid transition-[grid-template-columns,opacity] ease-in-out motion-reduce:transition-none"
              :class="[
                isWordOpen(index) ? 'grid-cols-[1fr] opacity-100' : 'grid-cols-[0fr] opacity-0',
                officeNamePhase === 'merged' ? 'duration-500' : 'duration-700',
              ]"
            >
              <span class="min-w-0 overflow-hidden">{{ item.rest }}</span>
            </span>
            <span
              aria-hidden="true"
              class="inline-grid text-muted-foreground transition-[grid-template-columns,opacity] duration-500 ease-in-out motion-reduce:transition-none"
              :class="isSeparatorShown(index) ? 'grid-cols-[1fr] opacity-100' : 'grid-cols-[0fr] opacity-0'"
            >
              <span class="min-w-0 overflow-hidden">{{ officeNameSeparator }}</span>
            </span>
          </span>
        </p>
        <p
          v-else
          class="invisible inline-block font-['Times_New_Roman',Times,serif] text-[4.4vw] font-bold tracking-[0.08em] text-balance max-sm:whitespace-nowrap! text-foreground sm:text-3xl sm:tracking-[0.15em] lg:text-4xl lg:tracking-[0.2em]"
          aria-hidden="true"
        >
          {{ officeName }}
        </p>
      </div>
    </div>
  </section>
</template>
