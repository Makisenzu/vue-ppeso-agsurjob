<script setup lang="ts">
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Pencil } from '@lucide/vue'

const props = defineProps<{
  username: string
  preferredJob: string
  experienceYears: string
  expectedSalary: string
  verifiedStatus: string
  educationLevel: string
  course: string
  skills: string[]
  bio: string
}>()

const initial = props.username?.charAt(0)?.toUpperCase() ?? '?'
</script>

<template>
  <Card class="border border-border/50 shadow-sm rounded-xl overflow-hidden bg-card">
    <!-- Header Section -->
    <div class="px-6 py-5 sm:px-8 sm:py-6 flex items-center justify-between gap-4">
      <div class="space-y-1">
        <div class="flex items-center gap-2">
          <h2 class="text-xl font-bold tracking-tight text-foreground">
            Profile Summary
          </h2>
        </div>
        <p class="text-xs text-muted-foreground">
          {{ bio }}
        </p>
      </div>

      <Pencil>
        {{ verifiedStatus }}
      </Pencil>
    </div>

    <div class="border-t border-border/40" />

    <!-- Details Content with Accordion -->
    <CardContent class="px-6 sm:px-8 py-0">
      <Accordion type="multiple" class="w-full">
        <!-- Experience -->
        <AccordionItem value="experience" class="border-border/40">
          <AccordionTrigger class="py-4 text-sm font-semibold tracking-wide text-foreground/80 hover:text-primary transition-colors hover:no-underline">
            Experience
          </AccordionTrigger>
          <AccordionContent class="pb-4 text-sm text-muted-foreground">
            {{ experienceYears }}
          </AccordionContent>
        </AccordionItem>

        <!-- Expected Salary -->
        <AccordionItem value="salary" class="border-border/40">
          <AccordionTrigger class="py-4 text-sm font-semibold tracking-wide text-foreground/80 hover:text-primary transition-colors hover:no-underline">
            Expected Salary
          </AccordionTrigger>
          <AccordionContent class="pb-4 text-sm text-muted-foreground font-medium">
            {{ expectedSalary }}
          </AccordionContent>
        </AccordionItem>

        <!-- Education -->
        <AccordionItem value="education" class="border-border/40">
          <AccordionTrigger class="py-4 text-sm font-semibold tracking-wide text-foreground/80 hover:text-primary transition-colors hover:no-underline">
            Education
          </AccordionTrigger>
          <AccordionContent class="pb-4 text-sm text-muted-foreground space-y-1">
            <p class="text-foreground/90 font-medium text-sm">{{ educationLevel }}</p>
            <p class="text-xs">{{ course }}</p>
          </AccordionContent>
        </AccordionItem>

        <!-- Skills and Technologies -->
        <AccordionItem value="skills" class="border-none">
          <AccordionTrigger class="py-4 text-sm font-semibold tracking-wide text-foreground/80 hover:text-primary transition-colors hover:no-underline">
            Skills & Technologies
          </AccordionTrigger>
          <AccordionContent class="pb-5">
            <div class="flex flex-wrap gap-1.5 pt-0.5">
              <Badge
                v-for="skill in skills"
                :key="skill"
                variant="outline"
                class="px-2.5 py-0.5 text-xs font-mono font-medium rounded-md bg-muted/30 text-foreground/80 hover:bg-muted/55 transition-colors"
              >
                {{ skill }}
              </Badge>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </CardContent>
  </Card>
</template>