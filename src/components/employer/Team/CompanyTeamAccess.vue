<script setup lang="ts">
import { Loader2, UserPlus, Users } from '@lucide/vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
    <Card>
      <CardHeader>
        <CardTitle class="text-base">Members</CardTitle>
      </CardHeader>
      <CardContent>
        <div v-if="isLoading" class="space-y-3">
          <Skeleton v-for="n in 2" :key="n" class="h-12 w-full" />
        </div>

        <Empty v-else-if="memberRows.length === 0">
          <EmptyHeader>
            <EmptyMedia variant="icon"><Users /></EmptyMedia>
            <EmptyTitle>No members yet</EmptyTitle>
            <EmptyDescription>Invite the people who post jobs or review applicants.</EmptyDescription>
          </EmptyHeader>
        </Empty>

        <ul v-else class="divide-y">
          <li
            v-for="row in memberRows"
            :key="row.member.member_id"
            class="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
          >
            <div class="min-w-0">
              <p class="truncate text-sm font-medium">{{ row.name }}</p>
              <p class="truncate text-xs text-muted-foreground">{{ row.detail }}</p>
            </div>
            <div class="flex items-center gap-2">
              <Badge variant="outline">{{ row.roleLabel }}</Badge>
              <Button
                variant="ghost"
                size="sm"
                class="text-destructive hover:text-destructive"
                :disabled="busyId === row.member.member_id"
                @click="memberToRemove = row.member"
              >
                Remove
              </Button>
            </div>
          </li>
        </ul>
      </CardContent>
    </Card>

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
            <FormDescription>Use an email that isn't on AGSURJOBS yet, such as a work email.</FormDescription>
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
          {{ memberToRemove?.full_name ?? memberToRemove?.email }} will lose access to your company right away.
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
</template>
