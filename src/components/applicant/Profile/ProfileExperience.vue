<script setup lang="ts">
import { Building2 } from '@lucide/vue'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

export interface Experience {
  id?: number
  job_title: string | null
  company_name: string | null
  start_date: string | null
  end_date: string | null
  description: string
}

defineProps<{
  experiences: Experience[]
}>()
</script>

<template>
  <div class="space-y-4">
    <!-- Section Header -->
    <div class="flex items-center justify-between pb-2 border-b border-border/40">
      <h3 class="text-base font-semibold text-foreground flex items-center gap-2">
        <Building2 class="h-4 w-4" />
        Work Experience
      </h3>
      <Badge variant="secondary" class="font-mono">
        {{ experiences.length }} {{ experiences.length === 1 ? 'role' : 'roles' }}
      </Badge>
    </div>

    <di v-if="experiences.length" class="space-y-3">
      <Card
        v-for="(exp, idx) in experiences"
        :key="exp.id ?? idx"
        class="group transition-all duration-200 hover:border-primary/30 hover:shadow-sm"
        size="sm"
      >
        <CardHeader class="space-y-3 pb-3">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0 space-y-1">
              <CardTitle class="text-sm leading-tight text-foreground/90 group-hover:text-primary transition-colors truncate">
                {{ exp.company_name || 'Unknown Company' }}
              </CardTitle>
              <p class="text-xs text-muted-foreground">
                {{ exp.job_title || 'Role not specified' }}
              </p>
            </div>

            <Badge variant="outline" class="shrink-0 font-mono text-[10px]">
              {{ exp.start_date || 'N/A' }} — {{ exp.end_date || 'Present' }}
            </Badge>
          </div>
        </CardHeader>

        <CardContent class="pt-0">
          <Separator class="mb-3" />
          <p class="text-xs leading-relaxed text-muted-foreground whitespace-pre-line">
            {{ exp.description || 'No description provided.' }}
          </p>
        </CardContent>
      </Card>
    </di  v>

    <Card v-else size="sm">
      <CardContent class="flex items-center justify-center px-6 py-8 text-center">
        <p class="text-sm text-muted-foreground">
          No work experience added yet.
        </p>
      </CardContent>
    </Card>
  </div>
</template>
