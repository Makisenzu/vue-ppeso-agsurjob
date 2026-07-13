<script setup lang="ts">
import SpotLightCard from './SpotLightCard.vue'
import Button from './ui/button/Button.vue'
import { useSignup } from '@/composables/useSignup.ts'
import { Check, Circle, Dot } from '@lucide/vue'

import { Stepper, StepperDescription, StepperIndicator, StepperItem, StepperSeparator, StepperTitle, StepperTrigger } from '@/components/ui/stepper'

const { canContinue, selectedRole, roles, isSelected, handleBack, nextStep, prevStep, step, progressStep } = useSignup()
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

</script>

<template>
  <div>
    <Card v-if="step === 0" class="w-full max-w-sm border-border/60 shadow-sm">
      <CardHeader class="space-y-1.5">
        <CardTitle class="text-xl font-semibold tracking-tight">
          Create your account
        </CardTitle>
        <CardDescription>
          Choose the role that best describes you to get started.
        </CardDescription>
      </CardHeader>

      <CardContent class="space-y-2.5">
        <SpotLightCard
          v-for="(role, index) in roles"
          :key="role.id"
          class="role-card"
          :class="{ 'role-card--selected': isSelected(role.id) }"
          :style="{ animationDelay: `${index * 80}ms` }"
          spotlight-color="rgba(0, 0, 196, 1.5)"
          @click="selectedRole = role.id"
        >
          <div class="flex items-center gap-3">
            <div class="role-card__icon" :class="{ 'role-card__icon--selected': isSelected(role.id) }">
              <component :is="role.icon" class="h-5 w-5" />
            </div>
            <div class="min-w-0">
              <p class="font-medium leading-snug">{{ role.label }}</p>
              <p class="text-sm text-muted-foreground leading-snug">
                {{ role.description }}
              </p>
            </div>
          </div>
          <Transition name="check">
            <Check
              v-if="isSelected(role.id)"
              class="h-5 w-5 shrink-0 text-primary"
            />
          </Transition>
        </SpotLightCard>
      </CardContent>

      <CardFooter class="flex flex-col gap-3">
        <Button class="w-full" :disabled="!canContinue" @click="nextStep">
          Continue
        </Button>
        <div class="flex items-center justify-center gap-1 text-sm text-muted-foreground">
          <span>Already have an account?</span>
          <Button variant="link" class="h-auto p-0" @click="handleBack">
            Log in
          </Button>
        </div>
      </CardFooter>
    </Card>

    <Card v-if="step === 1" class="w-full max-w-sm border-border/60 shadow-sm">
      <CardHeader class="space-y-1.5">
        <CardTitle class="text-xl font-semibold tracking-tight">
          <Stepper class="flex w-full items-start gap-2">
    <StepperItem
      v-for="step in progressStep"
      :key="step.step"
      v-slot="{ state }"
      class="relative flex w-full flex-col items-center justify-center"
      :step="step.step"
    >
      <StepperSeparator
        v-if="step.step !== progressStep[progressStep.length - 1]?.step"
        class="absolute left-[calc(50%+20px)] right-[calc(-50%+10px)] top-5 block h-0.5 shrink-0 rounded-full bg-muted group-data-[state=completed]:bg-primary"
      />
      <StepperTrigger as-child>
        <Button
          :variant="state === 'completed' || state === 'active' ? 'default' : 'outline'"
          size="icon"
          class="z-10 rounded-full shrink-0"
          :class="[state === 'active' && 'ring-2 ring-ring ring-offset-2 ring-offset-background']"
        >
          <Check v-if="state === 'completed'" class="size-5" />
          <Circle v-if="state === 'active'" />
          <Dot v-if="state === 'inactive'" />
        </Button>
      </StepperTrigger>
      <div class="mt-5 flex flex-col items-center text-center">
        <StepperTitle
          :class="[state === 'active' && 'text-primary']"
          class="text-sm font-semibold transition lg:text-base"
        >
          {{ step.title }}
        </StepperTitle>
      </div>
    </StepperItem>
  </Stepper>
        </CardTitle>
        <CardDescription>
          
        </CardDescription>
      </CardHeader>

      <CardContent>
      </CardContent>

      <CardFooter>

      </CardFooter>
    </Card>
  </div>
</template>

<style scoped>
/* ── Role Card overrides ── */
.role-card {
  /* Override SpotLightCard's default p-8 / rounded-3xl */
  padding: 0.875rem 1rem !important;
  border-radius: 0.75rem !important;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  border: 1.5px solid hsl(var(--border));
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    background-color 0.2s ease;

  /* Stagger entrance */
  animation: role-slide-in 0.35s ease both;
}

.role-card:hover {
  border-color: hsl(var(--primary) / 0.4);
}

.role-card--selected {
  border-color: hsl(var(--primary));
  box-shadow: 0 0 0 3px hsl(var(--primary) / 0.1);
  background-color: hsl(var(--primary) / 0.04);
}

/* ── Icon circle ── */
.role-card__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  flex-shrink: 0;
  border-radius: 0.5rem;
  background-color: hsl(var(--muted));
  color: hsl(var(--muted-foreground));
  transition:
    background-color 0.2s ease,
    color 0.2s ease;
}

.role-card__icon--selected {
  background-color: hsl(var(--primary) / 0.12);
  color: hsl(var(--primary));
}

/* ── Check icon transition ── */
.check-enter-active {
  transition: all 0.2s ease;
}
.check-leave-active {
  transition: all 0.15s ease;
}
.check-enter-from {
  opacity: 0;
  transform: scale(0.5);
}
.check-leave-to {
  opacity: 0;
  transform: scale(0.5);
}

/* ── Entrance animation ── */
@keyframes role-slide-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>