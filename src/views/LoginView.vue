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
  <div
    class="flex min-h-screen items-center justify-center bg-linear-to-br from-indigo-600 via-indigo-700 to-slate-900 px-4"
  >
    <div class="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl">
      <div class="mb-8 flex flex-col items-center gap-2">
        <span
          class="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-xl font-bold text-white"
          >M</span
        >
        <h1 class="text-xl font-bold text-slate-900">MotoDeals</h1>
        <p class="text-sm text-slate-500">Entra a tu cuenta para continuar</p>
      </div>

      <form class="flex flex-col gap-4" @submit.prevent="onSubmit">
        <label class="flex flex-col gap-1.5">
          <span class="text-sm font-medium text-slate-700">Correo</span>
          <input
            v-model="email"
            type="email"
            required
            autocomplete="username"
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
          />
        </label>

        <label class="flex flex-col gap-1.5">
          <span class="text-sm font-medium text-slate-700">Contraseña</span>
          <input
            v-model="password"
            type="password"
            required
            autocomplete="current-password"
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
          />
        </label>

        <p v-if="auth.error" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {{ auth.error }}
        </p>

        <button
          type="submit"
          :disabled="enviando"
          class="mt-2 w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {{ enviando ? 'Entrando...' : 'Entrar' }}
        </button>
      </form>
    </div>
  </div>
</template>
