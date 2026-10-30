<script setup lang="ts">
import { FlexRender } from '@tanstack/vue-table'
import { Loader2, UserPlus, Users } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import SwipeCardList from '@/components/SwipeCardList.vue'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import CustomBreadcrumbs from '@/components/CustomBreadcrumbs.vue'
import SearchSelect from '@/components/SearchSelect.vue'
import { useCompanyAccess } from '@/composables/employer/useCompanyAccess'

/** Team page (owner only): people who sign in to work for the company */
const {
  memberRows,
  table,
  columns,
  getRowCard,
  getRowSwipeActions,
  selectedIds,
  clearSelection,
  isBulkRemoving,
  isBulkRemoveOpen,
  confirmBulkRemove,
  invitationRows,
  isLoading,
  busyId,
  isInviteOpen,
  isInviting,
  roleOptions,
  openInvite,
  sendInvite,
  resend,
  revoke,
  memberToRemove,
  isRemoveOpen,
  confirmRemove,
} = useCompanyAccess()
</script>

<template>
  <div class="mx-auto w-full min-w-0 max-w-4xl flex-1 space-y-6 px-0 sm:px-6 lg:px-8">
    <CustomBreadcrumbs />

    <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Team</h1>
        <p class="text-sm text-muted-foreground">People who sign in to work for your company.</p>
      </div>
      <Button @click="openInvite">
        <UserPlus class="size-4" />
        Invite member
      </Button>
    </div>

    <!-- Members -->
    <section class="space-y-4">
      <Empty v-if="!isLoading && memberRows.length === 0" class="rounded-md border">
        <EmptyHeader>
          <EmptyMedia variant="icon"><Users /></EmptyMedia>
          <EmptyTitle>No members yet</EmptyTitle>
          <EmptyDescription>Invite the people who post jobs or review applicants.</EmptyDescription>
        </EmptyHeader>
      </Empty>

      <template v-else>
        <!-- Bulk action bar (DESIGN.md 13.1) -->
        <div
          v-if="selectedIds.length > 0"
          class="flex items-center justify-between gap-4 rounded-md border bg-muted/50 px-4 py-2"
        >
          <span class="text-sm text-muted-foreground">{{ selectedIds.length }} selected</span>
          <div class="flex items-center gap-2">
            <Button variant="ghost" size="sm" @click="clearSelection">Clear</Button>
            <Button variant="destructive" size="sm" :disabled="isBulkRemoving" @click="isBulkRemoveOpen = true">
              Remove selected
            </Button>
          </div>
        </div>

        <!-- Mobile: swipeable cards (DESIGN.md 13.2) -->
        <SwipeCardList
          class="md:hidden"
          :items="table.getRowModel().rows"
          :item-key="(row) => row.id"
          :card="(row) => getRowCard(row.original)"
          :actions="(row) => getRowSwipeActions(row.original)"
          :loading="isLoading && memberRows.length === 0"
          :is-selected="(row) => row.getIsSelected()"
          :all-selected="table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')"
          @toggle="(row, value) => row.toggleSelected(value)"
          @toggle-all="(value) => table.toggleAllPageRowsSelected(value)"
        />

        <!-- Desktop: table -->
        <div class="hidden overflow-x-auto rounded-md border md:block">
          <Table>
            <TableHeader>
              <TableRow v-for="headerGroup in table.getHeaderGroups()" :key="headerGroup.id">
                <TableHead v-for="header in headerGroup.headers" :key="header.id">
                  <FlexRender
                    v-if="!header.isPlaceholder"
                    :render="header.column.columnDef.header"
                    :props="header.getContext()"
                  />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <template v-if="isLoading && memberRows.length === 0">
                <TableRow v-for="i in 3" :key="i">
                  <TableCell v-for="col in columns.length" :key="col">
                    <Skeleton class="h-4 w-full" />
                  </TableCell>
                </TableRow>
              </template>

              <TableRow
                v-for="row in table.getRowModel().rows"
                v-else
                :key="row.id"
                :data-state="row.getIsSelected() ? 'selected' : undefined"
              >
                <TableCell v-for="cell in row.getVisibleCells()" :key="cell.id">
                  <FlexRender :render="cell.column.columnDef.cell" :props="cell.getContext()" />
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <!-- Pagination -->
        <div
          v-if="table.getPageCount() > 1"
          class="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <p class="text-center text-xs text-muted-foreground sm:text-left sm:text-sm">
            {{ memberRows.length }} member(s)
          </p>
          <div class="flex justify-center gap-2 sm:justify-end">
            <Button variant="outline" size="sm" :disabled="!table.getCanPreviousPage()" @click="table.previousPage()">
              Previous
            </Button>
            <Button variant="outline" size="sm" :disabled="!table.getCanNextPage()" @click="table.nextPage()">
              Next
            </Button>
          </div>
        </div>
      </template>
    </section>

    <!-- Pending invitations -->
    <Card v-if="invitationRows.length">
      <CardHeader>
        <CardTitle class="text-base">Pending invitations</CardTitle>
        <CardDescription>Links expire after 7 days.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul class="divide-y">
          <li
            v-for="row in invitationRows"
            :key="row.invitation.id"
            class="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
          >
            <div class="min-w-0">
              <p class="truncate text-sm font-medium">{{ row.invitation.email }}</p>
              <p class="text-xs" :class="row.isExpired ? 'text-destructive' : 'text-muted-foreground'">
                {{ row.roleLabel }} · {{ row.isExpired ? 'Expired' : 'Expires' }} {{ row.expiresLabel }}
              </p>
            </div>
            <div class="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                :disabled="busyId === row.invitation.id"
                @click="resend(row.invitation)"
              >
                <Loader2 v-if="busyId === row.invitation.id" class="size-4 animate-spin" />
                Resend
              </Button>
              <Button
                variant="ghost"
                size="sm"
                class="text-destructive hover:text-destructive"
                :disabled="busyId === row.invitation.id"
                @click="revoke(row.invitation)"
              >
                Cancel
              </Button>
            </div>
          </li>
        </ul>
      </CardContent>
    </Card>
  </div>

  <!-- Invite (short form: Dialog) -->
  <Dialog v-model:open="isInviteOpen">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Invite member</DialogTitle>
        <DialogDescription>They'll get an email to create their own account.</DialogDescription>
      </DialogHeader>

      <form class="space-y-4" @submit="sendInvite">
        <FormField v-slot="{ componentField }" name="email">
          <FormItem>
            <FormLabel>Email</FormLabel>
            <FormControl>
              <Input v-bind="componentField" type="email" autocomplete="off" placeholder="name@company.com" :disabled="isInviting" />
            </FormControl>
            <FormDescription>Use an email that isn't on AGSURJOBS yet, such as a work email. Members you removed can be invited again.</FormDescription>
            <FormMessage />
          </FormItem>
        </FormField>

        <FormField v-slot="{ componentField }" name="member_role">
          <FormItem>
            <FormLabel>Role</FormLabel>
            <FormControl>
              <SearchSelect v-bind="componentField" :options="roleOptions" :disabled="isInviting" class="w-full" />
            </FormControl>
            <FormDescription>Recruiters post jobs and review applicants. Viewers can only look.</FormDescription>
            <FormMessage />
          </FormItem>
        </FormField>

        <DialogFooter>
          <Button type="button" variant="outline" :disabled="isInviting" @click="isInviteOpen = false">Cancel</Button>
          <Button type="submit" :disabled="isInviting">
            <Loader2 v-if="isInviting" class="size-4 animate-spin" />
            {{ isInviting ? 'Sending...' : 'Send invitation' }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>

  <AlertDialog v-model:open="isRemoveOpen">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Remove this member?</AlertDialogTitle>
        <AlertDialogDescription>
          {{ memberToRemove?.full_name ?? memberToRemove?.email }} will lose access to your company right away and won't be able to sign in until you invite them again.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel :disabled="busyId !== null">Cancel</AlertDialogCancel>
        <Button variant="destructive" :disabled="busyId !== null" @click="confirmRemove">
          <Loader2 v-if="busyId !== null" class="size-4 animate-spin" />
          Remove
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>

  <AlertDialog v-model:open="isBulkRemoveOpen">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Remove {{ selectedIds.length }} member{{ selectedIds.length === 1 ? '' : 's' }}?</AlertDialogTitle>
        <AlertDialogDescription>
          They will lose access to your company right away and won't be able to sign in until you invite them again.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel :disabled="isBulkRemoving">Cancel</AlertDialogCancel>
        <Button variant="destructive" :disabled="isBulkRemoving" @click="confirmBulkRemove">
          <Loader2 v-if="isBulkRemoving" class="size-4 animate-spin" />
          {{ isBulkRemoving ? 'Removing...' : `Remove ${selectedIds.length}` }}
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
