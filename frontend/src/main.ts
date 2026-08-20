import './assets/main.css' // including the main CSS file for styling the application

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import axios from 'axios'
import { setupAuthInterceptor } from './lib/auth'
import { useUserStore } from './stores/user'

axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000'

const app = createApp(App)

app.use(createPinia())

// Both of these must happen before `app.use(router)`: installing the router
// starts the first navigation, which runs the `meta.requiresAuth` guard. The
// session used to be restored in App.vue's onBeforeMount, i.e. during mount —
// that worked only because Vue Router's guard queue starts from a resolved
// promise, so the guard ran a microtask later than the synchronous mount. Any
// await before mount would have bounced an authenticated hard-reload of
// /users or /profile/* to the login page (TD-32).
setupAuthInterceptor()
useUserStore().initStore()

app.use(router)

app.mount('#app')
