<script setup lang="ts">
import { BellOff, Check, EllipsisVertical, Mail, Trash2 } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useNotificationCenter } from '@/composables/common/useNotifications'

const {
  filter,
  groups,
  unreadCount,
  isLoading,
  hasLoaded,
  isMutating,
  isClearReadOpen,
  hasRead,
  toggleRead,
  markAllRead,
  remove,
  clearRead,
  getTypeMeta,
  formatTime,
} = useNotificationCenter()

const tabs = [
  { value: 'all', label: 'All' },
  { value: 'unread', label: 'Unread' },
] as const
</script>

<template>
  <!-- Notifications page shared by every role; each role's route points here -->
  <div class="mx-auto flex w-full max-w-3xl flex-col gap-6">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div class="flex flex-col gap-1">
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Notifications</h1>
        <p class="text-sm text-muted-foreground">
          {{ unreadCount > 0 ? `You have ${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}.` : "You're all caught up." }}
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" :disabled="unreadCount === 0 || isMutating" @click="markAllRead">
          <Check class="size-4" />
          Mark all as read
        </Button>
        <Button variant="outline" size="sm" :disabled="!hasRead || isMutating" @click="isClearReadOpen = true">
          <Trash2 class="size-4" />
          Clear read
        </Button>
      </div>
    </div>

    <div class="flex w-fit gap-1 rounded-lg bg-muted p-1" role="tablist" aria-label="Filter notifications">
      <button
        v-for="tab in tabs"
        :key="tab.value"
        type="button"
        role="tab"
        :aria-selected="filter === tab.value"
        class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        :class="filter === tab.value ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'"
        @click="filter = tab.value"
      >
        {{ tab.label }}
        <span v-if="tab.value === 'unread' && unreadCount > 0" class="ml-1 tabular-nums text-muted-foreground">{{ unreadCount }}</span>
      </button>
    </div>

    <Card v-if="isLoading && !hasLoaded" class="py-0">
      <CardContent class="flex flex-col gap-5 p-4">
        <div v-for="n in 4" :key="n" class="flex gap-3">
          <Skeleton class="size-9 shrink-0 rounded-full" />
          <div class="flex flex-1 flex-col gap-2">
            <Skeleton class="h-4 w-1/2" />
            <Skeleton class="h-3 w-full" />
          </div>
        </div>
      </CardContent>
    </Card>

    <Empty v-else-if="groups.length === 0" class="border">
      <EmptyHeader>
        <EmptyMedia variant="icon"><BellOff /></EmptyMedia>
        <EmptyTitle>{{ filter === 'unread' ? 'No unread notifications' : 'No notifications yet' }}</EmptyTitle>
        <EmptyDescription>Updates about your account and activity will show up here.</EmptyDescription>
      </EmptyHeader>
    </Empty>

    <template v-else>
      <section v-for="group in groups" :key="group.label" class="flex flex-col gap-2" :aria-label="group.label">
        <h2 class="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{{ group.label }}</h2>
        <Card class="py-0">
          <ul class="divide-y divide-border">
            <li
              v-for="item in group.items"
              :key="item.id"
              class="flex gap-3 p-4"
              :class="{ 'bg-primary/5': !item.is_read }"
            >
              <span class="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <component :is="getTypeMeta(item.type).icon" class="size-4" />
              </span>
              <div class="flex min-w-0 flex-1 flex-col gap-1">
                <div class="flex items-start gap-2">
                  <p class="min-w-0 flex-1 text-sm break-words" :class="item.is_read ? 'text-foreground' : 'font-semibold text-foreground'">
                    {{ item.title || getTypeMeta(item.type).label }}
                  </p>
                  <span v-if="!item.is_read" class="mt-1.5 size-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />
                </div>
                <p v-if="item.message" class="text-sm text-pretty break-words text-muted-foreground">{{ item.message }}</p>
                <p class="text-xs text-muted-foreground">{{ getTypeMeta(item.type).label }} · {{ formatTime(item.created_at) }}</p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger as-child>
                  <Button variant="ghost" size="icon-sm" class="shrink-0 text-muted-foreground" aria-label="Notification actions">
                    <EllipsisVertical class="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem @select="toggleRead(item)">
                    <component :is="item.is_read ? Mail : Check" class="size-4" />
                    {{ item.is_read ? 'Mark as unread' : 'Mark as read' }}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" @select="remove(item)">
                    <Trash2 class="size-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </li>
          </ul>
        </Card>
      </section>
    </template>

    <AlertDialog v-model:open="isClearReadOpen">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Clear read notifications?</AlertDialogTitle>
          <AlertDialogDescription>
            Every notification you've already read will be deleted. Unread ones stay. This can't be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel :disabled="isMutating">Cancel</AlertDialogCancel>
          <AlertDialogAction :disabled="isMutating" @click.prevent="clearRead">Clear read</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
