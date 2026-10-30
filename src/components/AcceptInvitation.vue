<script setup lang="ts">
import { Loader2 } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { useAcceptInvitation } from '@/composables/common/useAcceptInvitation'

/** /accept-invite: a person invited by a company creates their own member account (migration 081) */
const { invitation, roleLabel, hasAccount, isLoading, isAccepting, loadError, minPasswordLength, acceptInvitation, rejoin } =
  useAcceptInvitation()
</script>

<template>
  <Card class="w-full max-w-lg gap-5 sm:gap-6">
    <CardHeader class="px-4 sm:px-6">
      <CardTitle>
        <h1 class="text-xl font-bold tracking-tight sm:text-lg sm:font-semibold">
          {{ invitation && !loadError ? `Join ${invitation.company_name}` : 'Company invitation' }}
        </h1>
      </CardTitle>
      <CardDescription v-if="invitation && !loadError">
        You were invited as {{ roleLabel }}.
        {{ hasAccount ? 'Join with your existing account.' : 'Set up your account to continue.' }}
      </CardDescription>
    </CardHeader>

    <CardContent v-if="isLoading" class="space-y-4 px-4 sm:px-6">
      <Skeleton v-for="n in 4" :key="n" class="h-9 w-full" />
    </CardContent>

    <CardContent v-else-if="loadError" class="px-4 sm:px-6">
      <p class="text-sm text-muted-foreground">{{ loadError }}</p>
    </CardContent>

    <!-- Re-invited member: their account already exists -->
    <template v-else-if="hasAccount">
      <CardContent class="grid gap-2 px-4 sm:px-6">
        <Label for="rejoin-email">Account</Label>
        <Input id="rejoin-email" :model-value="invitation?.email ?? ''" disabled />
        <p class="text-xs text-muted-foreground">You'll sign in with this email and your current password.</p>
      </CardContent>
      <CardFooter class="px-4 pb-5 sm:justify-end sm:px-6 sm:pb-0">
        <Button class="h-11 w-full text-base sm:h-9 sm:w-auto sm:text-sm" :disabled="isAccepting" @click="rejoin">
          <Loader2 v-if="isAccepting" class="size-4 shrink-0 animate-spin" />
          {{ isAccepting ? 'Joining...' : 'Join company' }}
        </Button>
      </CardFooter>
    </template>

    <form v-else class="contents" @submit="acceptInvitation">
      <CardContent class="grid grid-cols-1 gap-4 px-4 sm:grid-cols-2 sm:px-6">
        <!-- Not a form field (FormLabel needs a FormField), just the invited email -->
        <div class="grid gap-2 sm:col-span-2">
          <Label for="invited-email">Email</Label>
          <Input id="invited-email" :model-value="invitation?.email ?? ''" disabled />
        </div>

        <FormField v-slot="{ componentField }" name="firstname">
          <FormItem>
            <FormLabel>First name</FormLabel>
            <FormControl>
              <Input v-bind="componentField" autocomplete="given-name" :disabled="isAccepting" />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <FormField v-slot="{ componentField }" name="lastname">
          <FormItem>
            <FormLabel>Last name</FormLabel>
            <FormControl>
              <Input v-bind="componentField" autocomplete="family-name" :disabled="isAccepting" />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <FormField v-slot="{ componentField }" name="contact_number">
          <FormItem class="sm:col-span-2">
            <FormLabel>Mobile number</FormLabel>
            <FormControl>
              <Input v-bind="componentField" inputmode="tel" autocomplete="tel" placeholder="09123456789" :disabled="isAccepting" />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <FormField v-slot="{ componentField }" name="password">
          <FormItem>
            <FormLabel>Password</FormLabel>
            <FormControl>
              <Input v-bind="componentField" type="password" autocomplete="new-password" :disabled="isAccepting" />
            </FormControl>
            <FormDescription>At least {{ minPasswordLength }} characters.</FormDescription>
            <FormMessage />
          </FormItem>
        </FormField>

        <FormField v-slot="{ componentField }" name="confirm_password">
          <FormItem>
            <FormLabel>Confirm password</FormLabel>
            <FormControl>
              <Input v-bind="componentField" type="password" autocomplete="new-password" :disabled="isAccepting" />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>
      </CardContent>

      <CardFooter class="px-4 pb-5 sm:justify-end sm:px-6 sm:pb-0">
        <Button type="submit" class="h-11 w-full text-base sm:h-9 sm:w-auto sm:text-sm" :disabled="isAccepting">
          <Loader2 v-if="isAccepting" class="size-4 shrink-0 animate-spin" />
          {{ isAccepting ? 'Joining...' : 'Join company' }}
        </Button>
      </CardFooter>
    </form>
  </Card>
</template>
