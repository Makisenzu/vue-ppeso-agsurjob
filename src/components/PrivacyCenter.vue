<script setup lang="ts">
import { Download, Loader2 } from '@lucide/vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
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
import { usePrivacyCenter } from '@/composables/common/usePrivacyCenter'

const {
  activeConsents,
  requests,
  requestOptions,
  isLoadingRequests,
  isExporting,
  withdrawingPurpose,
  isRequestSheetOpen,
  requestTitle,
  isErasure,
  requestDetails,
  requestDetailsMax,
  canSubmitRequest,
  isSubmittingRequest,
  openRequest,
  setRequestSheetOpen,
  submitRequest,
  downloadMyData,
  withdraw,
} = usePrivacyCenter()
</script>

<template>
  <div class="mx-auto flex w-full max-w-3xl min-w-0 flex-col gap-10 py-2">
    <header class="flex flex-col gap-2">
      <h1 class="text-2xl font-bold tracking-tight">Privacy &amp; My Data</h1>
      <p class="text-sm text-muted-foreground">
        Your rights under the Data Privacy Act.
        <AppLink :to="{ name: 'privacy-notice' }" class="font-medium text-primary hover:underline">Read the Privacy Notice</AppLink>
      </p>
    </header>

    <!-- Access and portability: self-service -->
    <section class="flex flex-col gap-4" aria-labelledby="privacy-download">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div class="min-w-0">
          <h2 id="privacy-download" class="text-base font-semibold">Your data</h2>
          <p class="text-sm text-muted-foreground">Everything we hold about you, in one file.</p>
        </div>
        <Button variant="outline" class="h-10 w-full sm:w-auto" :disabled="isExporting" @click="downloadMyData">
          <Loader2 v-if="isExporting" class="size-4 animate-spin" />
          <Download v-else class="size-4" />
          {{ isExporting ? 'Preparing...' : 'Download my data' }}
        </Button>
      </div>
    </section>

    <Separator />

    <!-- Consents -->
    <section class="flex flex-col gap-4" aria-labelledby="privacy-consents">
      <h2 id="privacy-consents" class="text-base font-semibold">Your consents</h2>
      <ul v-if="activeConsents.length" class="flex flex-col divide-y border-y">
        <li
          v-for="consent in activeConsents"
          :key="`${consent.purpose}-${consent.notice_version}`"
          class="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div class="min-w-0">
            <p class="text-sm">{{ consent.label }}</p>
            <p class="text-xs text-muted-foreground">
              Given {{ consent.grantedOn }}<template v-if="!consent.isCurrentVersion"> · earlier notice</template>
            </p>
          </div>
          <AlertDialog v-if="consent.canWithdraw">
            <AlertDialogTrigger as-child>
              <Button variant="ghost" size="sm" class="h-10 w-fit text-destructive" :disabled="withdrawingPurpose === consent.purpose">
                Withdraw
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Withdraw consent?</AlertDialogTitle>
                <AlertDialogDescription>PESO will stop this processing and delete the related data.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction class="bg-destructive text-white hover:bg-destructive/90" @click="withdraw(consent.purpose)">
                  Withdraw
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </li>
      </ul>
      <p v-else class="text-sm text-muted-foreground">No consents on record.</p>
      <p class="text-xs text-muted-foreground">Consents your account needs end only when you delete your account.</p>
    </section>

    <Separator />

    <!-- Requests to the Data Protection Officer -->
    <section class="flex flex-col gap-4" aria-labelledby="privacy-requests">
      <h2 id="privacy-requests" class="text-base font-semibold">Requests</h2>
      <ul class="flex flex-col divide-y border-y">
        <li v-for="option in requestOptions" :key="option.type" class="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div class="min-w-0">
            <p class="text-sm font-medium">{{ option.label }}</p>
            <p class="text-xs text-muted-foreground">{{ option.description }}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            class="h-10 w-full sm:w-auto"
            :class="{ 'text-destructive': option.type === 'erasure' }"
            :disabled="option.isOpen"
            @click="openRequest(option.type)"
          >
            {{ option.isOpen ? 'Request open' : 'Request' }}
          </Button>
        </li>
      </ul>

      <h3 class="pt-2 text-sm font-semibold">Your requests</h3>
      <div v-if="isLoadingRequests" class="flex flex-col gap-2">
        <Skeleton v-for="n in 2" :key="n" class="h-14 w-full" />
      </div>
      <ul v-else-if="requests.length" class="flex flex-col divide-y border-y">
        <li v-for="request in requests" :key="request.id" class="flex flex-col gap-1 py-3">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <p class="text-sm font-medium">{{ request.label }}</p>
            <Badge variant="outline" :class="request.badgeClass">{{ request.status }}</Badge>
          </div>
          <p class="text-xs text-muted-foreground">
            Sent {{ request.filedOn }}<template v-if="request.resolvedOn"> · closed {{ request.resolvedOn }}</template>
          </p>
          <p v-if="request.resolution_note" class="text-sm text-muted-foreground">{{ request.resolution_note }}</p>
        </li>
      </ul>
      <p v-else class="text-sm text-muted-foreground">No requests yet.</p>
    </section>

    <Sheet :open="isRequestSheetOpen" @update:open="setRequestSheetOpen">
      <SheetContent class="flex h-full flex-col p-0 sm:max-w-lg">
        <SheetHeader class="shrink-0 px-6 pt-6 pb-2">
          <SheetTitle>{{ requestTitle }}</SheetTitle>
          <SheetDescription>
            {{ isErasure ? 'Your account, records and files will be permanently deleted once PESO confirms.' : 'PESO\'s Data Protection Officer will reply here.' }}
          </SheetDescription>
        </SheetHeader>

        <form class="contents" @submit.prevent="submitRequest">
          <div class="flex flex-1 flex-col gap-2 overflow-y-auto px-6 py-4">
            <Label for="privacy-request-details">{{ isErasure ? 'Reason (optional)' : 'Details' }}</Label>
            <Textarea
              id="privacy-request-details"
              v-model="requestDetails"
              rows="6"
              :maxlength="requestDetailsMax"
              :placeholder="isErasure ? '' : 'What should PESO look at?'"
            />
            <p class="text-xs text-muted-foreground">{{ requestDetails.length }} / {{ requestDetailsMax }}</p>
          </div>

          <SheetFooter class="shrink-0 flex-row justify-end gap-2 border-t px-6 py-4">
            <Button type="button" variant="outline" :disabled="isSubmittingRequest" @click="setRequestSheetOpen(false)">Cancel</Button>
            <Button
              type="submit"
              :variant="isErasure ? 'destructive' : 'default'"
              :disabled="!canSubmitRequest || isSubmittingRequest"
            >
              <Loader2 v-if="isSubmittingRequest" class="size-4 animate-spin" />
              {{ isSubmittingRequest ? 'Sending...' : 'Send request' }}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  </div>
</template>
