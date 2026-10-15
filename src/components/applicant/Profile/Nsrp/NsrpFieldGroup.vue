<script setup lang="ts">
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

/**
 * One group of NSRP fields. The wizard shows each group as its own card; the profile editor
 * sets `flat` because the groups already sit inside a section card.
 */
defineProps<{
  title: string
  description?: string
  flat?: boolean
  contentClass?: string
}>()
</script>

<template>
  <section v-if="flat" class="space-y-4">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="space-y-0.5">
        <h3 class="text-sm font-semibold text-foreground">{{ title }}</h3>
        <p v-if="description" class="text-sm text-muted-foreground">{{ description }}</p>
      </div>
      <slot name="action" />
    </div>
    <div :class="contentClass">
      <slot />
    </div>
  </section>

  <Card v-else>
    <CardHeader>
      <CardTitle class="text-base">{{ title }}</CardTitle>
      <CardDescription v-if="description">{{ description }}</CardDescription>
      <CardAction v-if="$slots.action">
        <slot name="action" />
      </CardAction>
    </CardHeader>
    <CardContent :class="contentClass">
      <slot />
    </CardContent>
  </Card>
</template>
