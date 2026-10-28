<script setup lang="ts">
import LandingFooter from '@/components/landing/LandingFooter.vue'
import LandingHeader from '@/components/landing/LandingHeader.vue'
import { Separator } from '@/components/ui/separator'
import { usePrivacyNotice } from '@/composables/landing/usePrivacyNotice'

const { sections, contact, effectiveOn, privacyCenterRoute } = usePrivacyNotice()
</script>

<template>
  <div class="min-h-dvh bg-background font-sans text-foreground">
    <!-- Public Privacy Notice (RA 10173), linked from signup, the consent screen and the footer.
         Keep this comment inside the root: App.vue's out-in <transition> needs a single element root -->
    <LandingHeader />
    <main id="main" class="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <header class="flex flex-col gap-3">
        <h1 class="text-3xl font-bold tracking-tight sm:text-4xl">Privacy Notice</h1>
        <p class="text-sm text-muted-foreground">Effective {{ effectiveOn }}</p>
        <p class="text-base text-muted-foreground">How AGSURJOBS collects, uses and protects your personal information.</p>
      </header>

      <Separator class="my-8" />

      <div class="flex flex-col gap-10">
        <section v-for="section in sections" :id="section.id" :key="section.id" class="flex flex-col gap-3">
          <h2 class="text-lg font-semibold">{{ section.title }}</h2>
          <ul v-if="section.items" class="flex list-disc flex-col gap-2 pl-5 text-sm leading-relaxed text-foreground">
            <li v-for="item in section.items" :key="item">{{ item }}</li>
          </ul>
          <p v-for="paragraph in section.paragraphs" :key="paragraph" class="text-sm leading-relaxed text-foreground">
            {{ paragraph }}
          </p>
        </section>

        <section id="contact" class="flex flex-col gap-3">
          <h2 class="text-lg font-semibold">Contact us</h2>
          <dl class="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
            <div>
              <dt class="text-xs text-muted-foreground">Data Protection Officer</dt>
              <dd class="text-sm font-medium">{{ contact.dpoTitle }}</dd>
            </div>
            <div class="min-w-0">
              <dt class="text-xs text-muted-foreground">Email</dt>
              <dd class="text-sm font-medium break-all">
                <AppLink :href="`mailto:${contact.email}`" class="hover:text-primary">{{ contact.email }}</AppLink>
              </dd>
            </div>
            <div class="sm:col-span-2">
              <dt class="text-xs text-muted-foreground">Office</dt>
              <dd class="text-sm font-medium">{{ contact.office }}</dd>
            </div>
          </dl>
          <p v-if="privacyCenterRoute" class="text-sm text-muted-foreground">
            You can also send a request from
            <AppLink :to="privacyCenterRoute" class="font-medium text-primary hover:underline">Privacy &amp; My Data</AppLink>.
          </p>
        </section>
      </div>
    </main>
    <LandingFooter />
  </div>
</template>
