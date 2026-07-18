import './assets/main.css' // including the main CSS file for styling the application

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import axios from 'axios'
import { setupAuthInterceptor } from './lib/auth'

axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000'

const app = createApp(App)

app.use(createPinia())
setupAuthInterceptor() // after pinia: the 401-refresh interceptor uses the user store
app.use(router)

app.mount('#app')
