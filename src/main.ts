import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { MotionPlugin } from '@vueuse/motion'

import App from './App.vue'
import router from './router'
import AppLink from './components/AppLink.vue'
import { initMonitoring } from './lib/monitoring'
import './style.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(MotionPlugin)
// Every link in the app: RouterLink without an href, so hovering never shows the URL (AppLink.vue)
app.component('AppLink', AppLink)

// Error monitoring in production (off until VITE_SENTRY_DSN is set); loads in the background
void initMonitoring(app, router)

app.mount('#app')
