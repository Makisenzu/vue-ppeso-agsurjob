<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Building2, Landmark, Users } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const route = useRoute()
const router = useRouter()

const selectedProgram = computed(() => {
  const p = (route.query.program as string | undefined)?.toLowerCase()
  if (p === 'pgas') return 'PGAS'
  if (p === 'dole') return 'DOLE'
  return 'All Programs'
})

function goBack() {
  router.push({ name: 'provincial-peso-gip' })
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- Header -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="space-y-1">
        <div class="flex items-center gap-2">
          <Button variant="ghost" size="sm" class="gap-1.5 px-2" @click="goBack">
            <ArrowLeft class="h-4 w-4" />
            <span>Back to Dashboard</span>
          </Button>
          <Badge variant="outline" class="text-xs uppercase font-mono font-semibold">
            {{ selectedProgram }}
          </Badge>
        </div>
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">
          Government Internship Program Details
        </h1>
        <p class="text-sm text-muted-foreground">
          Detailed intern monitoring, demographic breakdown, and deployment records.
        </p>
      </div>
    </div>

    <!-- Details Card -->
    <Card>
      <CardHeader>
        <div class="flex items-center justify-between">
          <div>
            <CardTitle class="text-lg font-semibold">
              GIP Intern Records & Statistics
            </CardTitle>
            <CardDescription>
              Viewing dataset for <span class="font-medium text-foreground">{{ selectedProgram }}</span>
            </CardDescription>
          </div>
          <div class="flex items-center gap-2">
            <Button
              size="sm"
              :variant="selectedProgram === 'PGAS' ? 'default' : 'outline'"
              @click="router.push({ query: { program: 'pgas' } })"
            >
              <Landmark class="mr-1.5 h-3.5 w-3.5" />
              PGAS
            </Button>
            <Button
              size="sm"
              :variant="selectedProgram === 'DOLE' ? 'default' : 'outline'"
              @click="router.push({ query: { program: 'dole' } })"
            >
              <Building2 class="mr-1.5 h-3.5 w-3.5" />
              DOLE
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div class="flex min-h-75 flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
          <div class="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-3">
            <Users class="h-6 w-6" />
          </div>
          <h3 class="text-base font-semibold">GIP {{ selectedProgram }} Intern Details</h3>
          <p class="text-sm text-muted-foreground max-w-md mt-1">
            Detailed breakdown and intern registry list for {{ selectedProgram }} are ready to be populated.
          </p>
        </div>
      </CardContent>
    </Card>
  </div>
</template>