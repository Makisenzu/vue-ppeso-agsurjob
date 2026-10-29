<script setup lang="ts">
import { ImagePlus, Loader2, Trash2 } from '@lucide/vue'
import { Button } from '@/components/ui/button'

/** Company cover photo band with owner controls (upload / replace / remove). */
const props = defineProps<{
  coverUrl: string | null
  companyName: string
  isUpdating: boolean
}>()

const emit = defineEmits<{
  select: [event: Event]
  remove: []
}>()
</script>

<template>
  <div class="relative h-36 w-full overflow-hidden rounded-xl border border-border bg-muted sm:h-48 lg:h-56">
    <img
      v-if="props.coverUrl"
      :src="props.coverUrl"
      :alt="`Cover photo of ${props.companyName}`"
      class="h-full w-full object-cover"
    />
    <div v-else class="h-full w-full bg-linear-to-br from-primary/15 via-muted to-muted" aria-hidden="true" />

    <div v-if="props.isUpdating" class="absolute inset-0 flex items-center justify-center bg-background/70">
      <Loader2 class="size-6 animate-spin text-muted-foreground" />
    </div>

    <div class="absolute right-3 bottom-3 flex gap-2">
      <Button
        v-if="props.coverUrl"
        variant="secondary"
        size="sm"
        :disabled="props.isUpdating"
        aria-label="Remove cover photo"
        @click="emit('remove')"
      >
        <Trash2 class="size-4" />
      </Button>
      <Button variant="secondary" size="sm" :disabled="props.isUpdating" as-child>
        <label class="cursor-pointer">
          <ImagePlus class="size-4" />
          {{ props.coverUrl ? 'Change cover' : 'Add cover photo' }}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            class="sr-only"
            :disabled="props.isUpdating"
            @change="emit('select', $event)"
          />
        </label>
      </Button>
    </div>
  </div>
</template>
