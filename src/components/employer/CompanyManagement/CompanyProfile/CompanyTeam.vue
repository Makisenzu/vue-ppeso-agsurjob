<script setup lang="ts">
import { ImagePlus, Loader2, Pencil, Plus, Trash2, Users } from '@lucide/vue'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
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
import { useCompanyTeam } from '@/composables/employer/useCompanyTeam'

/** Team Members card of the company profile, with its add / edit and delete dialogs */
const {
  teamMembers,
  isLoading,
  isDialogOpen,
  dialogTitle,
  isSaving,
  photoPreview,
  openDialog,
  onPhotoSelected,
  clearPhoto,
  saveMember,
  memberToDelete,
  isDeleteOpen,
  deletingId,
  confirmDelete,
} = useCompanyTeam()
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>Team Members</CardTitle>
      <CardDescription>The people applicants will work with.</CardDescription>
      <CardAction>
        <Button variant="outline" size="sm" :disabled="isLoading" @click="openDialog()">
          <Plus class="size-3.5" />
          Add
        </Button>
      </CardAction>
    </CardHeader>
    <CardContent>
      <div v-if="isLoading" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div v-for="n in 3" :key="n" class="flex items-center gap-3">
          <Skeleton class="size-12 rounded-full" />
          <div class="space-y-1.5">
            <Skeleton class="h-4 w-28" />
            <Skeleton class="h-3 w-20" />
          </div>
        </div>
      </div>

      <div v-else-if="teamMembers.length === 0" class="flex flex-col items-center gap-2 py-6 text-center">
        <div class="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Users class="size-5" />
        </div>
        <p class="text-sm text-muted-foreground">No team members listed yet.</p>
      </div>

      <ul v-else class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <li
          v-for="member in teamMembers"
          :key="member.id"
          class="flex min-w-0 items-center gap-3 rounded-lg border border-border p-3"
        >
          <Avatar class="size-12 shrink-0 border border-border">
            <AvatarImage v-if="member.photoUrl" :src="member.photoUrl" :alt="member.full_name" class="object-cover" />
            <AvatarFallback class="bg-primary/10 text-sm font-semibold text-primary">{{ member.initials }}</AvatarFallback>
          </Avatar>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium text-foreground" :title="member.full_name">{{ member.full_name }}</p>
            <p class="truncate text-xs text-muted-foreground" :title="member.position ?? ''">
              {{ member.position || '—' }}
            </p>
          </div>
          <div class="flex shrink-0 gap-1">
            <Button
              variant="ghost"
              size="icon"
              class="size-8"
              :aria-label="`Edit ${member.full_name}`"
              @click="openDialog(member)"
            >
              <Pencil class="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              class="size-8 text-destructive hover:text-destructive"
              :disabled="deletingId === member.id"
              :aria-label="`Remove ${member.full_name}`"
              @click="memberToDelete = member"
            >
              <Loader2 v-if="deletingId === member.id" class="size-3.5 animate-spin" />
              <Trash2 v-else class="size-3.5" />
            </Button>
          </div>
        </li>
      </ul>
    </CardContent>
  </Card>

  <!-- Add / edit (short form, so a Dialog rather than a Sheet) -->
  <Dialog v-model:open="isDialogOpen">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{{ dialogTitle }}</DialogTitle>
        <DialogDescription>Only list people who agreed to appear on your company profile.</DialogDescription>
      </DialogHeader>

      <form class="space-y-5" @submit="saveMember">
        <div class="flex items-center gap-4">
          <Avatar class="size-16 border border-border">
            <AvatarImage v-if="photoPreview" :src="photoPreview" alt="Team member photo" class="object-cover" />
            <AvatarFallback class="bg-muted text-muted-foreground"><Users class="size-6" /></AvatarFallback>
          </Avatar>
          <div class="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" :disabled="isSaving" as-child>
              <label class="cursor-pointer">
                <ImagePlus class="size-4" />
                {{ photoPreview ? 'Change photo' : 'Add photo' }}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  class="sr-only"
                  :disabled="isSaving"
                  @change="onPhotoSelected"
                />
              </label>
            </Button>
            <Button v-if="photoPreview" type="button" variant="ghost" size="sm" :disabled="isSaving" @click="clearPhoto">
              Remove
            </Button>
          </div>
        </div>

        <FormField v-slot="{ componentField }" name="full_name">
          <FormItem>
            <FormLabel>Full name</FormLabel>
            <FormControl>
              <Input v-bind="componentField" autocomplete="off" placeholder="Juan Dela Cruz" :disabled="isSaving" />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <FormField v-slot="{ componentField }" name="position">
          <FormItem>
            <FormLabel>Position <span class="font-normal text-muted-foreground">(optional)</span></FormLabel>
            <FormControl>
              <Input v-bind="componentField" autocomplete="off" placeholder="HR Manager" :disabled="isSaving" />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <DialogFooter>
          <Button type="button" variant="outline" :disabled="isSaving" @click="isDialogOpen = false">Cancel</Button>
          <Button type="submit" :disabled="isSaving">
            <Loader2 v-if="isSaving" class="size-4 animate-spin" />
            {{ isSaving ? 'Saving...' : 'Save' }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>

  <AlertDialog v-model:open="isDeleteOpen">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Remove this team member?</AlertDialogTitle>
        <AlertDialogDescription>
          <strong class="font-medium text-foreground">{{ memberToDelete?.full_name }}</strong> and their photo will be
          removed from your company profile.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel :disabled="deletingId !== null">Cancel</AlertDialogCancel>
        <Button variant="destructive" :disabled="deletingId !== null" @click="confirmDelete">
          <Loader2 v-if="deletingId !== null" class="size-4 animate-spin" />
          Remove
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
