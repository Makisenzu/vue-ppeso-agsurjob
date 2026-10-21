<script setup lang="ts">
import { useUnreadAnnouncements } from '@/composables/common/useUnreadAnnouncements'

const { unreadAnnouncementCount, countLabel } = useUnreadAnnouncements()
</script>

<template>
  <!-- Place inside a `relative` bell button; renders nothing when there are no unread announcements -->
  <span
    v-if="unreadAnnouncementCount > 0"
    class="pointer-events-none absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-primary-foreground tabular-nums"
    :aria-label="`${unreadAnnouncementCount} unread announcements`"
  >
    {{ countLabel }}
  </span>
</template>
