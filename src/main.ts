import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth'

const app = createApp(App)

app.use(createPinia())
app.use(router)

// Empieza a escuchar el estado de sesión antes de montar, para que el guard de rutas
// (router/index.ts) pueda esperar a que se resuelva antes de decidir redirecciones.
useAuthStore().iniciarListener()

app.mount('#app')
