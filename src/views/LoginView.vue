<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const email = ref('')
const password = ref('')
const enviando = ref(false)

async function onSubmit() {
  enviando.value = true
  try {
    await auth.login(email.value, password.value)
    const redirect = (route.query.redirect as string) || '/'
    router.push(redirect)
  } catch {
    // auth.error ya queda seteado por el store
  } finally {
    enviando.value = false
  }
}
</script>

<template>
  <div class="login">
    <form @submit.prevent="onSubmit">
      <h1>MotoDeals</h1>

      <label>
        Correo
        <input v-model="email" type="email" required autocomplete="username" />
      </label>

      <label>
        Contraseña
        <input v-model="password" type="password" required autocomplete="current-password" />
      </label>

      <p v-if="auth.error" class="error">{{ auth.error }}</p>

      <button type="submit" :disabled="enviando">
        {{ enviando ? 'Entrando...' : 'Entrar' }}
      </button>
    </form>
  </div>
</template>

<style scoped>
.login {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
}

form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  width: 100%;
  max-width: 320px;
}

label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.error {
  color: #c0392b;
  margin: 0;
}
</style>
