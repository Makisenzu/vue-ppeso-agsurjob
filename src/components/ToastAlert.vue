<script setup lang="ts">
import { useToastAlert } from '@/composables/useToastAlert'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { CircleCheckIcon, OctagonXIcon, InfoIcon, XIcon } from '@lucide/vue'
import { TransitionGroup } from 'vue'

const { alerts, dismiss } = useToastAlert()
</script>

<template>
  <Teleport to="body">
    <div class="fixed bottom-4 left-4 z-[9999] flex flex-col-reverse gap-3 max-w-sm w-full pointer-events-none">
      <TransitionGroup
        enter-active-class="transition-all duration-300 ease-out"
        leave-active-class="transition-all duration-200 ease-in"
        enter-from-class="opacity-0 translate-y-4 scale-95"
        enter-to-class="opacity-100 translate-y-0 scale-100"
        leave-from-class="opacity-100 translate-y-0 scale-100"
        leave-to-class="opacity-0 -translate-x-8 scale-95"
      >
        <div
          v-for="alert in alerts"
          :key="alert.id"
          class="pointer-events-auto shadow-lg rounded-lg"
        >
          <Alert
            :variant="alert.variant"
            class="relative pr-10 shadow-lg border"
            :class="{
              'border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950': alert.type === 'success',
              'border-destructive/50 bg-destructive/5': alert.type === 'error',
              'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950': alert.type === 'info',
            }"
          >
            <CircleCheckIcon
              v-if="alert.type === 'success'"
              class="size-4 text-emerald-600 dark:text-emerald-400"
            />
            <OctagonXIcon
              v-else-if="alert.type === 'error'"
              class="size-4 text-destructive"
            />
            <InfoIcon
              v-else
              class="size-4 text-blue-600 dark:text-blue-400"
            />

            <AlertTitle
              :class="{
                'text-emerald-800 dark:text-emerald-200': alert.type === 'success',
                'text-destructive': alert.type === 'error',
                'text-blue-800 dark:text-blue-200': alert.type === 'info',
              }"
            >
              {{ alert.title }}
            </AlertTitle>

            <AlertDescription
              v-if="alert.description"
              :class="{
                'text-emerald-700/80 dark:text-emerald-300/80': alert.type === 'success',
                'text-destructive/80': alert.type === 'error',
                'text-blue-700/80 dark:text-blue-300/80': alert.type === 'info',
              }"
            >
              {{ alert.description }}
            </AlertDescription>

            <button
              class="absolute top-2.5 right-2.5 rounded-md p-0.5 opacity-60 hover:opacity-100 transition-opacity"
              @click="dismiss(alert.id)"
            >
              <XIcon class="size-3.5" />
            </button>
          </Alert>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>
