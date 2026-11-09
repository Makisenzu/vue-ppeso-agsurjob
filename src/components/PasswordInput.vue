<script setup lang="ts">
import { computed, ref, useAttrs } from 'vue'
import { Eye, EyeOff } from '@lucide/vue'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()
// The eye button follows the input's disabled state
const isDisabled = computed(() => attrs.disabled as boolean | undefined)
const isVisible = ref(false)
</script>

<template>
  <div class="relative w-full">
    <Input
      v-bind="attrs"
      :type="isVisible ? 'text' : 'password'"
      :class="cn('pr-9', attrs.class as string)"
    />
    <button
      type="button"
      class="absolute inset-y-0 right-0 flex items-center px-2.5 text-muted-foreground hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
      :aria-label="isVisible ? 'Hide password' : 'Show password'"
      :aria-pressed="isVisible"
      :disabled="isDisabled"
      @click="isVisible = !isVisible"
    >
      <EyeOff v-if="isVisible" class="size-4" />
      <Eye v-else class="size-4" />
    </button>
  </div>
</template>
