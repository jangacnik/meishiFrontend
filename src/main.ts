import { createApp } from 'vue'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import Aura from '@primeuix/themes/aura'
import ConfirmationService from 'primevue/confirmationservice'
import ToastService from 'primevue/toastservice'
import './style.css'
import App from './App.vue'
import router from './router'
import { setUnauthorizedHandler } from './lib/api'
import { useAuthStore } from './stores/auth'

const app = createApp(App)

app.use(createPinia())
app.use(router)
// darkModeSelector: false - this app is deliberately light-only (washi/ink theme);
// without this, PrimeVue auto-switches components to dark mode based on the visitor's
// OS/browser color-scheme preference, clashing with the rest of the page's fixed palette.
app.use(PrimeVue, { theme: { preset: Aura, options: { darkModeSelector: false } } })
app.use(ConfirmationService)
app.use(ToastService)

const auth = useAuthStore()
setUnauthorizedHandler(() => {
  auth.logout()
  router.push({ name: 'login', query: { redirect: router.currentRoute.value.fullPath, expired: '1' } })
})

app.mount('#app')
