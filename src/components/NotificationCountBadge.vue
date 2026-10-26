<script setup lang="ts">
import { useNotificationBadge } from '@/composables/common/useNotifications'

const { unreadCount, countLabel } = useNotificationBadge()
</script>

<template>
  <!-- Place inside a `relative` bell button; renders nothing when there are no unread notifications -->
  <span
    v-if="unreadCount > 0"
    class="pointer-events-none absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-primary-foreground tabular-nums"
    :aria-label="`${unreadCount} unread notifications`"
  >
    {{ countLabel }}
  </span>
</template>
