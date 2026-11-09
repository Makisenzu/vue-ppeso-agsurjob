<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { CAPTCHA_SITE_KEY, isCaptchaEnabled } from '@/composables/common/useCaptcha'

/**
 * Cloudflare Turnstile check before sign-in / sign-up (see useCaptcha.ts). Renders nothing while
 * CAPTCHA is off. Re-mount it (`:key`) for a new token after each attempt.
 */
const token = defineModel<string | null>({ default: null })

type Turnstile = {
  render: (el: HTMLElement, options: Record<string, unknown>) => string
  remove: (widgetId: string) => void
}
declare global {
  interface Window {
    turnstile?: Turnstile
  }
}

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
let scriptPromise: Promise<void> | null = null

function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve()
  scriptPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SCRIPT_SRC
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => {
      scriptPromise = null
      reject(new Error('The security check could not load.'))
    }
    document.head.appendChild(script)
  })
  return scriptPromise
}

const container = ref<HTMLDivElement | null>(null)
const loadError = ref('')
let widgetId: string | null = null

onMounted(async () => {
  if (!isCaptchaEnabled || !container.value) return
  try {
    await loadScript()
    if (!container.value || !window.turnstile) return
    widgetId = window.turnstile.render(container.value, {
      sitekey: CAPTCHA_SITE_KEY,
      theme: 'auto',
      size: 'flexible',
      callback: (value: string) => {
        token.value = value
      },
      'expired-callback': () => {
        token.value = null
      },
      'error-callback': () => {
        token.value = null
      },
    })
  } catch (error: unknown) {
    loadError.value = error instanceof Error ? error.message : 'The security check could not load.'
  }
})

onBeforeUnmount(() => {
  if (widgetId && window.turnstile) window.turnstile.remove(widgetId)
  widgetId = null
})
</script>

<template>
  <div v-if="isCaptchaEnabled" class="grid gap-1">
    <div ref="container" class="min-h-[65px] w-full" />
    <p v-if="loadError" class="text-xs text-destructive">{{ loadError }} Check your connection and reload the page.</p>
  </div>
</template>
