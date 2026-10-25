<script setup lang="ts">
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useLandingAbout } from '@/composables/landing/useLandingAbout'

const { titleLead, titleAccent, points, logos } = useLandingAbout()
const [provinceLogo, pesoLogo] = logos
</script>

<template>
  <!-- #about is the "About" target in the header nav -->
  <section id="about" aria-labelledby="about-title" class="scroll-mt-16 bg-background">
    <div class="mx-auto grid max-w-7xl items-center gap-12 px-4 pt-6 pb-16 sm:px-6 sm:pt-8 sm:pb-20 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:pt-10 lg:pb-24">
      <div class="flex flex-col gap-6">
        <!-- Second line in the same Times New Roman as the office name above (DESIGN.md exception) -->
        <h2 id="about-title" class="text-4xl leading-tight font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
          {{ titleLead }}
          <span class="block font-['Times_New_Roman',Times,serif] font-normal tracking-normal text-primary italic">
            {{ titleAccent }}
          </span>
        </h2>

        <div class="flex flex-col gap-6 border-l-2 border-border pl-6 text-base text-pretty text-muted-foreground sm:text-lg">
          <p v-for="point in points" :key="point.emphasis">
            {{ point.lead }}<span class="font-medium text-foreground">{{ point.emphasis }}</span>{{ point.tail }}
          </p>
        </div>
      </div>

      <!-- The province's seal on the left, the PESO logo on the right, the same size. after:hidden drops the
           Avatar's outline so only the logos show. Hidden on phones, where the text carries the section -->
      <div class="hidden items-center justify-center gap-6 sm:flex sm:gap-10 lg:gap-12">
        <Avatar class="size-36 after:hidden sm:size-48 lg:size-56">
          <AvatarImage :src="provinceLogo.src" :alt="provinceLogo.alt" class="size-full object-contain" />
          <AvatarFallback class="text-2xl font-bold">{{ provinceLogo.fallback }}</AvatarFallback>
        </Avatar>
        <Avatar class="size-36 after:hidden sm:size-48 lg:size-56">
          <AvatarImage :src="pesoLogo.src" :alt="pesoLogo.alt" class="size-full object-contain" />
          <AvatarFallback class="text-2xl font-bold">{{ pesoLogo.fallback }}</AvatarFallback>
        </Avatar>
      </div>
    </div>
  </section>
</template>
