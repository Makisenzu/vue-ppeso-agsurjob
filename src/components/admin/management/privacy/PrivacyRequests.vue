<script setup lang="ts">
import { Loader2 } from '@lucide/vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { usePrivacyRequests } from '@/composables/admin/usePrivacyRequests'

const {
  rows,
  total,
  isLoading,
  isSaving,
  statusFilter,
  statusOptions,
  currentPage,
  pageCount,
  isDetailsOpen,
  selected,
  note,
  noteError,
  onStatusFilterChange,
  goToPage,
  openDetails,
  setDetailsOpen,
  setStatus,
  completeErasure,
} = usePrivacyRequests()
</script>

<template>
  <!-- A request queue, not a data table: requests are never deleted here, they prove each was handled -->
  <div class="w-full min-w-0 space-y-6 p-2">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div class="flex flex-col gap-1">
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Privacy Requests</h1>
        <p class="text-sm text-muted-foreground">Data subject requests under the Data Privacy Act.</p>
      </div>
      <NativeSelect :model-value="statusFilter" class="w-full sm:w-48" aria-label="Status" @update:model-value="onStatusFilterChange">
        <NativeSelectOption v-for="option in statusOptions" :key="option.value" :value="option.value">
          {{ option.label }}
        </NativeSelectOption>
      </NativeSelect>
    </div>

    <div v-if="isLoading" class="flex flex-col gap-2">
      <Skeleton v-for="n in 4" :key="n" class="h-16 w-full" />
    </div>

    <Empty v-else-if="!rows.length" class="border">
      <EmptyHeader>
        <EmptyTitle>No requests</EmptyTitle>
        <EmptyDescription>Requests from applicants and employers appear here.</EmptyDescription>
      </EmptyHeader>
    </Empty>

    <ul v-else class="flex flex-col divide-y rounded-lg border">
      <li v-for="row in rows" :key="row.id">
        <button
          type="button"
          class="flex w-full min-w-0 flex-col gap-1 px-4 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex-row sm:items-center sm:justify-between sm:gap-4"
          @click="openDetails(row)"
        >
          <div class="min-w-0">
            <p class="text-sm font-medium">{{ row.typeLabel }}</p>
            <p class="truncate text-xs text-muted-foreground">
              {{ row.requester }}<template v-if="row.roleLabel"> · {{ row.roleLabel }}</template> · {{ row.filedOn }}
            </p>
          </div>
          <Badge variant="outline" class="w-fit shrink-0" :class="row.badgeClass">{{ row.status }}</Badge>
        </button>
      </li>
    </ul>

    <div v-if="pageCount > 1" class="flex items-center justify-between gap-2">
      <p class="text-sm text-muted-foreground">{{ total }} requests</p>
      <div class="flex items-center gap-2">
        <Button variant="outline" class="h-10" :disabled="currentPage <= 1 || isLoading" @click="goToPage(currentPage - 1)">Previous</Button>
        <span class="text-sm tabular-nums text-muted-foreground">{{ currentPage }} / {{ pageCount }}</span>
        <Button variant="outline" class="h-10" :disabled="currentPage >= pageCount || isLoading" @click="goToPage(currentPage + 1)">Next</Button>
      </div>
    </div>

    <Sheet :open="isDetailsOpen" @update:open="setDetailsOpen">
      <SheetContent class="flex h-full flex-col p-0 sm:max-w-lg">
        <template v-if="selected">
          <SheetHeader class="shrink-0 px-6 pt-6 pb-2">
            <SheetTitle>{{ selected.typeLabel }}</SheetTitle>
            <SheetDescription>Sent {{ selected.filedOn }}.</SheetDescription>
          </SheetHeader>

          <div class="flex flex-1 flex-col gap-6 overflow-y-auto px-6 py-4">
            <div class="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
              <div>
                <span class="text-xs text-muted-foreground">Status</span>
                <div class="mt-0.5">
                  <Badge variant="outline" :class="selected.badgeClass">{{ selected.status }}</Badge>
                </div>
              </div>
              <div class="min-w-0">
                <span class="text-xs text-muted-foreground">Requester</span>
                <p class="text-sm font-medium">{{ selected.requester_name || 'Deleted account' }}</p>
                <p v-if="selected.requester_email" class="break-all text-xs text-muted-foreground">{{ selected.requester_email }}</p>
              </div>
              <div class="sm:col-span-2">
                <span class="text-xs text-muted-foreground">Details</span>
                <p class="whitespace-pre-line text-sm">{{ selected.details || '—' }}</p>
              </div>
              <div v-if="selected.resolution_note" class="sm:col-span-2">
                <span class="text-xs text-muted-foreground">Reply{{ selected.resolvedOn ? ` · ${selected.resolvedOn}` : '' }}</span>
                <p class="whitespace-pre-line text-sm">{{ selected.resolution_note }}</p>
              </div>
            </div>

            <template v-if="selected.isOpen">
              <Separator />
              <div class="flex flex-col gap-2">
                <Label for="privacy-request-note">Reply to the requester</Label>
                <Textarea id="privacy-request-note" v-model="note" rows="4" maxlength="2000" />
                <p v-if="noteError" class="text-sm text-destructive">{{ noteError }}</p>
                <p v-else class="text-xs text-muted-foreground">Required when rejecting.</p>
              </div>
            </template>
          </div>

          <SheetFooter v-if="selected.isOpen" class="shrink-0 flex-col gap-2 border-t px-6 py-4 sm:flex-row sm:justify-end">
            <Button variant="outline" :disabled="isSaving" @click="setStatus('Rejected')">Reject</Button>
            <Button v-if="selected.status === 'Pending'" variant="outline" :disabled="isSaving" @click="setStatus('In progress')">
              Mark in progress
            </Button>
            <AlertDialog v-if="selected.canErase">
              <AlertDialogTrigger as-child>
                <Button variant="destructive" :disabled="isSaving">Delete account</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this account?</AlertDialogTitle>
                  <AlertDialogDescription>The account, its records and files will be permanently deleted.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction class="bg-destructive text-white hover:bg-destructive/90" @click="completeErasure">
                    Delete account
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button v-else :disabled="isSaving" @click="setStatus('Completed')">
              <Loader2 v-if="isSaving" class="size-4 animate-spin" />
              {{ isSaving ? 'Saving...' : 'Complete' }}
            </Button>
          </SheetFooter>
        </template>
      </SheetContent>
    </Sheet>
  </div>
</template>
