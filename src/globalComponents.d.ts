// Components registered with app.component in main.ts, typed for templates
import type AppLink from '@/components/AppLink.vue'

declare module 'vue' {
  interface GlobalComponents {
    AppLink: typeof AppLink
  }
}

export {}
