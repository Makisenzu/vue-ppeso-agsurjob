<script setup lang="ts">
import { useAppFooter } from '@/composables/common/useAppFooter'

/** Compact footer of the signed-in layouts: copyright, privacy links and the office's contacts */
const { office, year, links, contacts } = useAppFooter()
</script>

<template>
  <footer class="border-t border-border bg-background">
    <div
      class="mx-auto flex w-full max-w-7xl flex-col items-center gap-2 px-4 py-4 text-xs text-muted-foreground sm:flex-row sm:justify-between sm:px-6"
    >
      <p class="text-center sm:text-left">© {{ year }} {{ office }}</p>

      <nav aria-label="Footer" class="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
        <AppLink
          v-for="link in links"
          :key="link.label"
          :to="link.to"
          class="inline-flex min-h-10 items-center transition-colors hover:text-foreground sm:min-h-8"
        >
          {{ link.label }}
        </AppLink>
        <AppLink
          v-for="contact in contacts"
          :key="contact.type"
          :href="contact.href"
          :target="contact.href.startsWith('http') ? '_blank' : undefined"
          :aria-label="`${contact.type}: ${contact.label}`"
          :title="contact.label"
          class="inline-flex size-10 items-center justify-center rounded-md transition-colors hover:text-foreground sm:size-8"
        >
          <component :is="contact.icon" class="size-4" />
        </AppLink>
      </nav>
    </div>
  </footer>
</template>
