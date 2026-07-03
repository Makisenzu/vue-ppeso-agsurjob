<script setup lang="ts">
import { Building2 } from '@lucide/vue'

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
      <span class="text-xs text-muted-foreground font-mono bg-muted/50 px-2 py-0.5 rounded-full">
        {{ experiences.length }} {{ experiences.length === 1 ? 'role' : 'roles' }}
      </span>
    </div>

    <!-- Experience Timeline -->
    <div class="relative space-y-0">
      <!-- Timeline connector line -->
      <div
        v-if="experiences.length > 1"
        class="absolute left-[19px] top-6 bottom-6 w-px bg-border/60"
      ></div>

      <div
        v-for="(exp, idx) in experiences"
        :key="exp.id ?? idx"
        class="relative group"
      >
        <!-- Experience Card with timeline dot -->
        <div class="flex gap-4">
          <!-- Timeline Dot -->
          <div class="relative z-10 mt-4 shrink-0">
            <div
              class="w-[10px] h-[10px] rounded-full border-2 transition-all duration-200"
              :class="idx === 0
                ? 'bg-primary border-primary shadow-[0_0_0_3px] shadow-primary/20'
                : 'bg-card border-border group-hover:border-primary group-hover:bg-primary/20'"
            ></div>
          </div>

          <!-- Card Content -->
          <div class="flex-1 p-4 rounded-xl border border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all duration-200 cursor-default mb-3 group-hover:shadow-sm">
            <div class="flex justify-between items-start mb-2">
              <div class="space-y-0.5 min-w-0 flex-1">
                <h4 class="font-semibold text-sm text-foreground/90 group-hover:text-primary transition-colors leading-tight truncate">
                  {{ exp.company_name }}
                </h4>
                <p class="text-xs text-muted-foreground">
                  {{ exp.job_title }}
                </p>
              </div>
              <span class="text-[10px] font-mono text-muted-foreground bg-muted/50 px-2 py-1 rounded-md shrink-0 ml-3">
                {{ exp.start_date }} — {{ exp.end_date || 'Present' }}
              </span>
            </div>
            <p class="text-xs text-muted-foreground leading-relaxed">
              {{ exp.description }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
