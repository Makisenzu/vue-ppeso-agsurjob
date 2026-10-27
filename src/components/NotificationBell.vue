<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'
import { Bell, BellOff } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Skeleton } from '@/components/ui/skeleton'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import NotificationCountBadge from '@/components/NotificationCountBadge.vue'
import { useNotificationBell } from '@/composables/common/useNotifications'

// Each layout passes its role's notifications page
const props = defineProps<{ to: RouteLocationRaw }>()

const { open, preview, unreadCount, isLoading, hasLoaded, isMutating, markAllRead, readItem, getTypeMeta, formatTime, getBody } =
  useNotificationBell(() => props.to)
</script>

<template>
  <!-- Bell for every role's header: a popover with the newest notifications and a link to the full page -->
  <Popover v-model:open="open">
    <PopoverTrigger as-child>
      <Button variant="ghost" size="icon-sm" title="Notifications" aria-label="Notifications" class="relative text-muted-foreground">
        <Bell class="size-4" />
        <NotificationCountBadge />
      </Button>
    </PopoverTrigger>

    <PopoverContent align="end" class="w-[min(24rem,calc(100vw-2rem))] gap-0 p-0">
      <div class="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <p class="text-sm font-semibold text-foreground">Notifications</p>
        <Button
          variant="ghost"
          size="sm"
          class="h-7 px-2 text-xs"
          :disabled="unreadCount === 0 || isMutating"
          @click="markAllRead"
        >
          Mark all as read
        </Button>
      </div>

      <div class="max-h-96 overflow-y-auto">
        <!-- Skeleton only on the first load; later reopenings refresh behind the current list -->
        <div v-if="isLoading && !hasLoaded" class="flex flex-col gap-3 p-4">
          <div v-for="n in 3" :key="n" class="flex gap-3">
            <Skeleton class="size-8 shrink-0 rounded-full" />
            <div class="flex flex-1 flex-col gap-2">
              <Skeleton class="h-3.5 w-2/3" />
              <Skeleton class="h-3 w-full" />
            </div>
          </div>
        </div>

        <Empty v-else-if="preview.length === 0" class="p-8">
          <EmptyHeader>
            <EmptyMedia variant="icon"><BellOff /></EmptyMedia>
            <EmptyTitle>You're all caught up</EmptyTitle>
            <EmptyDescription>New notifications will show up here.</EmptyDescription>
          </EmptyHeader>
        </Empty>

        <ul v-else class="divide-y divide-border">
          <li v-for="item in preview" :key="item.id">
            <button
              type="button"
              class="flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
              :class="{ 'bg-primary/5': !item.is_read }"
              @click="readItem(item)"
            >
              <span class="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <component :is="getTypeMeta(item.type).icon" class="size-4" />
              </span>
              <span class="flex min-w-0 flex-1 flex-col gap-0.5">
                <span class="flex items-start gap-2">
                  <span class="min-w-0 flex-1 truncate text-sm" :class="item.is_read ? 'text-foreground' : 'font-semibold text-foreground'">
                    {{ item.title || getTypeMeta(item.type).label }}
                  </span>
                  <span v-if="!item.is_read" class="mt-1.5 size-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />
                </span>
                <span v-if="getBody(item)" class="line-clamp-2 text-xs text-muted-foreground">{{ getBody(item) }}</span>
                <span class="text-xs text-muted-foreground">{{ getTypeMeta(item.type).label }} · {{ formatTime(item.created_at) }}</span>
              </span>
            </button>
          </li>
        </ul>
      </div>

      <div class="border-t border-border p-2">
        <Button variant="ghost" size="sm" class="w-full" as-child>
          <AppLink :to="to" @click="open = false">View all notifications</AppLink>
        </Button>
      </div>
    </PopoverContent>
  </Popover>
</template>
