<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import SpotLightCard from './SpotLightCard.vue'
import Button from './ui/button/Button.vue'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { UserSearch, Building2, Check } from '@lucide/vue'

type Role = 'admin' | 'employer' | 'applicant'

const selectedRole = ref<Role | null>(null)
const router = useRouter()
const roles: {
  id: Role
  label: string
  description: string
  icon: typeof UserSearch
}[] = [
  {
    id: 'applicant',
    label: 'Applicant',
    description: 'Search for jobs and apply to opportunities.',
    icon: UserSearch,
  },
  {
    id: 'employer',
    label: 'Employer',
    description: 'Post jobs and manage candidate applications.',
    icon: Building2,
  },
]

const isSelected = (id: Role) => selectedRole.value === id
const canContinue = computed(() => selectedRole.value !== null)

const handleBack = () => {
  router.push('/login')
}
function handleContinue() {
  if (!selectedRole.value) return
  
}
</script>

<template>
  <Card class="w-full max-w-sm border-border/60 shadow-sm">
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
      <Button class="w-full" :disabled="!canContinue" @click="handleContinue">
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