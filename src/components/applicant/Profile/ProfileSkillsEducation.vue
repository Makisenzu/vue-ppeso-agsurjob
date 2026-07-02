<script setup lang="ts">
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Code2, BookOpen, GraduationCap } from '@lucide/vue'

defineProps<{
  skills: string[]
  educationLevel: string
  course: string
}>()
</script>

<template>
  <div class="space-y-6">

    <!-- Skills Card -->
    <Card class="border-none shadow-sm">
      <CardHeader class="pb-3 border-b border-border/40">
        <CardTitle class="text-base flex items-center gap-2">
          <div class="bg-amber-500/10 dark:bg-amber-500/20 p-1.5 rounded-lg">
            <Code2 class="h-4 w-4 text-amber-500" />
          </div>
          Skills & Technologies
        </CardTitle>
      </CardHeader>
      <CardContent class="pt-4">
        <div class="flex flex-wrap gap-2">
          <div
            v-for="skill in skills"
            :key="skill"
            class="px-3 py-1.5 text-xs font-mono border border-border/50 rounded-full bg-muted/30 text-foreground/80 hover:border-primary/30 hover:bg-primary/5 hover:text-primary transition-all cursor-default"
          >
            {{ skill }}
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Education Card -->
    <Card class="border-none shadow-sm relative overflow-hidden group">
      <div class="absolute inset-0 bg-linear-to-br from-primary/5 via-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      <CardHeader class="relative z-10 pb-3 border-b border-border/40">
        <CardTitle class="text-base flex items-center gap-2">
          <div class="bg-emerald-500/10 dark:bg-emerald-500/20 p-1.5 rounded-lg">
            <BookOpen class="h-4 w-4 text-emerald-500" />
          </div>
          Education
        </CardTitle>
      </CardHeader>
      <CardContent class="relative z-10 pt-4">
        <div class="flex items-start gap-4">
          <div class="bg-muted/50 p-2.5 rounded-xl border border-border/30 shrink-0">
            <GraduationCap class="h-5 w-5 text-muted-foreground" />
          </div>
          <div class="space-y-1 min-w-0">
            <h4 class="font-semibold text-sm text-foreground/90">
              {{ educationLevel }}
            </h4>
            <p class="text-xs text-muted-foreground">
              {{ course }}
            </p>
            <p class="text-[10px] font-mono text-muted-foreground/60 pt-1">
              Completed / Attended
            </p>
          </div>
        </div>
      </CardContent>
    </Card>

  </div>
</template>
