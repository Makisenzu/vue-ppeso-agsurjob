import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { MotionPlugin } from '@vueuse/motion'

import App from './App.vue'
import router from './router'
import AppLink from './components/AppLink.vue'
import './style.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(MotionPlugin)
// Every link in the app: RouterLink without an href, so hovering never shows the URL (AppLink.vue)
app.component('AppLink', AppLink)

app.mount('#app')
