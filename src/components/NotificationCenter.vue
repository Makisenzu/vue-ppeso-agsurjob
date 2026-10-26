<script setup lang="ts">
import { ArrowLeft, BellOff, CheckCheck, Loader2, Mail, MailOpen, Minus, RefreshCw, Star, Trash2 } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import {
  AlertDialog,
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
  filtered,
  starredCount,
  unreadCount,
  isLoading,
  hasLoaded,
  isMutating,
  idsToDelete,
  load,
  markAllRead,
  toggleStar,
  selectedCount,
  selectAllState,
  isSelected,
  toggleSelected,
  toggleSelectAll,
  selectedHasUnread,
  markSelected,
  requestDeleteSelected,
  opened,
  openedId,
  openItem,
  closeItem,
  requestDeleteOpened,
  markOpenedUnread,
  isDeleteDialogOpen,
  confirmDelete,
  getTypeMeta,
  formatListDate,
  formatFullDate,
  getBody,
  getRemarks,
} = useNotificationCenter()

const tabs = [
  { value: 'all', label: 'All' },
  { value: 'unread', label: 'Unread' },
  { value: 'starred', label: 'Starred' },
] as const

const toolbarButton = 'size-8 text-muted-foreground hover:text-foreground'
</script>

<template>
  <!-- Notifications page shared by every role, laid out like an email inbox; each role's route points here -->
  <div class="mx-auto flex w-full max-w-6xl flex-col gap-4">
    <div class="flex flex-col gap-1">
      <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Notifications</h1>
      <p class="text-sm text-muted-foreground">
        {{ unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up." }}
      </p>
    </div>

    <div class="overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-xs">
      <!-- ─── Opened notification ─── -->
      <template v-if="openedId !== null">
        <div class="flex items-center gap-1 border-b border-border px-2 py-1.5">
          <Button variant="ghost" size="icon" :class="toolbarButton" title="Back to notifications" aria-label="Back to notifications" @click="closeItem">
            <ArrowLeft class="size-4" />
          </Button>
          <template v-if="opened">
            <Button variant="ghost" size="icon" :class="toolbarButton" title="Mark as unread" aria-label="Mark as unread" :disabled="isMutating" @click="markOpenedUnread">
              <Mail class="size-4" />
            </Button>
            <Button variant="ghost" size="icon" :class="toolbarButton" title="Delete" aria-label="Delete" :disabled="isMutating" @click="requestDeleteOpened">
              <Trash2 class="size-4" />
            </Button>
          </template>
        </div>

        <div v-if="!hasLoaded" class="flex flex-col gap-4 p-6">
          <Skeleton class="h-7 w-2/3" />
          <Skeleton class="h-4 w-1/3" />
          <Skeleton class="h-20 w-full" />
        </div>

        <article v-else-if="opened" class="flex flex-col gap-6 p-4 sm:p-6">
          <div class="flex items-start gap-3">
            <h2 class="min-w-0 flex-1 text-xl font-semibold text-pretty break-words text-foreground sm:text-2xl">
              {{ opened.title || getTypeMeta(opened.type).label }}
            </h2>
            <button
              type="button"
              class="mt-1 shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              :aria-label="opened.is_starred ? 'Unstar' : 'Star'"
              :aria-pressed="!!opened.is_starred"
              @click="toggleStar(opened)"
            >
              <Star class="size-5" :class="opened.is_starred ? 'fill-amber-400 text-amber-500' : ''" />
            </button>
          </div>

          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div class="flex items-center gap-3">
              <span class="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <component :is="getTypeMeta(opened.type).icon" class="size-5" />
              </span>
              <div class="min-w-0">
                <p class="text-sm font-semibold text-foreground">AGSURJOBS</p>
                <p class="text-xs text-muted-foreground">{{ getTypeMeta(opened.type).label }}</p>
              </div>
            </div>
            <p class="text-xs text-muted-foreground">{{ formatFullDate(opened.created_at) }}</p>
          </div>

          <div class="flex flex-col gap-4 sm:pl-13">
            <p class="text-sm leading-relaxed whitespace-pre-line text-pretty break-words text-foreground">
              {{ getBody(opened) || 'No details.' }}
            </p>

            <!-- Staff remarks kept apart from the message so the two never read as one -->
            <section
              v-if="getRemarks(opened)"
              class="flex flex-col gap-1 rounded-lg border border-border bg-muted/50 p-4"
              aria-labelledby="notification-remarks-title"
            >
              <h3 id="notification-remarks-title" class="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Remarks
              </h3>
              <p class="text-sm leading-relaxed whitespace-pre-line text-pretty break-words text-foreground">
                {{ getRemarks(opened) }}
              </p>
            </section>
          </div>
        </article>

        <Empty v-else class="p-10">
          <EmptyHeader>
            <EmptyMedia variant="icon"><BellOff /></EmptyMedia>
            <EmptyTitle>Notification not found</EmptyTitle>
            <EmptyDescription>It may have been deleted.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button variant="outline" size="sm" @click="closeItem">Back to notifications</Button>
          </EmptyContent>
        </Empty>
      </template>

      <!-- ─── Inbox ─── -->
      <template v-else>
        <!-- Tabs -->
        <div class="flex gap-1 overflow-x-auto border-b border-border px-2" role="tablist" aria-label="Filter notifications">
          <button
            v-for="tab in tabs"
            :key="tab.value"
            type="button"
            role="tab"
            :aria-selected="filter === tab.value"
            class="-mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            :class="filter === tab.value ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'"
            @click="filter = tab.value"
          >
            {{ tab.label }}
            <span
              v-if="(tab.value === 'unread' && unreadCount > 0) || (tab.value === 'starred' && starredCount > 0)"
              class="rounded-full bg-muted px-1.5 text-xs tabular-nums text-muted-foreground"
            >
              {{ tab.value === 'unread' ? unreadCount : starredCount }}
            </span>
          </button>
        </div>

        <!-- Toolbar: select all, then bulk actions while rows are selected -->
        <div class="flex items-center gap-1 border-b border-border px-2 py-1.5">
          <div class="flex size-8 items-center justify-center">
            <Checkbox
              :model-value="selectAllState"
              :disabled="filtered.length === 0"
              aria-label="Select all"
              @update:model-value="toggleSelectAll"
            >
              <Minus v-if="selectAllState === 'indeterminate'" />
            </Checkbox>
          </div>

          <template v-if="selectedCount > 0">
            <Button variant="ghost" size="icon" :class="toolbarButton" title="Mark as read" aria-label="Mark as read" :disabled="isMutating || !selectedHasUnread" @click="markSelected(true)">
              <MailOpen class="size-4" />
            </Button>
            <Button variant="ghost" size="icon" :class="toolbarButton" title="Mark as unread" aria-label="Mark as unread" :disabled="isMutating" @click="markSelected(false)">
              <Mail class="size-4" />
            </Button>
            <Button variant="ghost" size="icon" :class="toolbarButton" title="Delete" aria-label="Delete" :disabled="isMutating" @click="requestDeleteSelected">
              <Trash2 class="size-4" />
            </Button>
            <span class="ml-1 text-sm text-muted-foreground">{{ selectedCount }} selected</span>
          </template>
          <template v-else>
            <Button variant="ghost" size="icon" :class="toolbarButton" title="Refresh" aria-label="Refresh" :disabled="isLoading" @click="load">
              <RefreshCw class="size-4" :class="{ 'animate-spin': isLoading }" />
            </Button>
            <Button variant="ghost" size="icon" :class="toolbarButton" title="Mark all as read" aria-label="Mark all as read" :disabled="isMutating || unreadCount === 0" @click="markAllRead">
              <CheckCheck class="size-4" />
            </Button>
          </template>

          <span v-if="filtered.length > 0" class="ml-auto pr-2 text-xs text-muted-foreground tabular-nums">
            1–{{ filtered.length }} of {{ filtered.length }}
          </span>
        </div>

        <!-- Rows -->
        <div v-if="isLoading && !hasLoaded" class="divide-y divide-border">
          <div v-for="n in 6" :key="n" class="flex items-center gap-3 px-4 py-3">
            <Skeleton class="size-4 shrink-0" />
            <Skeleton class="h-4 w-28 shrink-0" />
            <Skeleton class="h-4 flex-1" />
            <Skeleton class="h-4 w-14 shrink-0" />
          </div>
        </div>

        <Empty v-else-if="filtered.length === 0" class="p-10">
          <EmptyHeader>
            <EmptyMedia variant="icon"><BellOff /></EmptyMedia>
            <EmptyTitle>
              {{ filter === 'unread' ? 'No unread notifications' : filter === 'starred' ? 'No starred notifications' : 'No notifications yet' }}
            </EmptyTitle>
            <EmptyDescription>
              {{ filter === 'starred' ? 'Star a notification to keep it here.' : 'Updates about your account and activity will show up here.' }}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>

        <ul v-else class="divide-y divide-border">
          <li
            v-for="item in filtered"
            :key="item.id"
            class="flex items-start gap-1 px-2 transition-shadow hover:relative hover:z-10 hover:shadow-md sm:items-center"
            :class="isSelected(item) ? 'bg-primary/10' : item.is_read ? 'bg-muted/40' : 'bg-card'"
          >
            <div class="flex size-8 shrink-0 items-center justify-center max-sm:mt-2.5">
              <Checkbox
                :model-value="isSelected(item)"
                :aria-label="`Select ${item.title || getTypeMeta(item.type).label}`"
                @update:model-value="(checked) => toggleSelected(item, checked)"
              />
            </div>
            <button
              type="button"
              class="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground/70 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-sm:mt-2.5"
              :aria-label="item.is_starred ? 'Unstar' : 'Star'"
              :aria-pressed="!!item.is_starred"
              @click="toggleStar(item)"
            >
              <Star class="size-4" :class="item.is_starred ? 'fill-amber-400 text-amber-500' : ''" />
            </button>

            <!-- Phones: sender + date, then subject, then snippet. Wider: one line like an inbox row -->
            <button
              type="button"
              class="flex min-w-0 flex-1 flex-col gap-0.5 py-2.5 pr-2 pl-1 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset sm:flex-row sm:items-center sm:gap-4"
              :class="item.is_read ? 'text-muted-foreground' : 'text-foreground'"
              @click="openItem(item)"
            >
              <span class="flex items-center justify-between gap-2 sm:contents">
                <span class="truncate sm:w-44 sm:shrink-0" :class="{ 'font-bold text-foreground': !item.is_read }">
                  {{ getTypeMeta(item.type).label }}
                </span>
                <span class="shrink-0 text-xs tabular-nums sm:order-last sm:w-16 sm:text-right" :class="{ 'font-bold text-foreground': !item.is_read }">
                  {{ formatListDate(item.created_at) }}
                </span>
              </span>
              <span class="min-w-0 flex-1 truncate">
                <span :class="item.is_read ? 'text-foreground/80' : 'font-bold text-foreground'">
                  {{ item.title || getTypeMeta(item.type).label }}
                </span>
                <span v-if="getBody(item)" class="text-muted-foreground max-sm:block max-sm:truncate">
                  <span class="max-sm:hidden"> - </span>{{ getBody(item) }}
                </span>
              </span>
            </button>
          </li>
        </ul>
      </template>
    </div>

    <AlertDialog v-model:open="isDeleteDialogOpen">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Delete {{ idsToDelete.length === 1 ? 'this notification' : `${idsToDelete.length} notifications` }}?
          </AlertDialogTitle>
          <AlertDialogDescription>This can't be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel :disabled="isMutating">Cancel</AlertDialogCancel>
          <!-- A plain Button: AlertDialogAction closes the dialog on click, which cleared the ids before the delete ran -->
          <Button variant="destructive" :disabled="isMutating" @click="confirmDelete">
            <Loader2 v-if="isMutating" class="size-4 shrink-0 animate-spin" />
            Delete
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
