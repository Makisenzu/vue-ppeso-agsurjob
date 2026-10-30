<script setup lang="ts">
import { Building2 } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { useAuth } from '@/composables/common/useAuth'

/** A company member whose membership was removed by the owner (router guard, migration 081) */
const { handleSignOut } = useAuth()
</script>

<template>
  <Empty class="mx-auto max-w-md border">
    <EmptyHeader>
      <EmptyMedia variant="icon"><Building2 /></EmptyMedia>
      <EmptyTitle>No company access</EmptyTitle>
      <EmptyDescription>You're no longer a member of a company. Ask a company owner to invite you again.</EmptyDescription>
    </EmptyHeader>
    <EmptyContent>
      <Button variant="outline" @click="handleSignOut">Sign out</Button>
    </EmptyContent>
  </Empty>
</template>
