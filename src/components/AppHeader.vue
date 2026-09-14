<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

async function cerrarSesion() {
  await auth.logout()
  router.push({ name: 'login' })
}

const etiquetaRol: Record<string, string> = {
  superadmin: 'Superadmin',
  cliente: 'Cliente',
}
</script>

<template>
  <header class="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur">
    <div class="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
      <div class="flex items-center gap-6">
        <router-link :to="{ name: 'inventario' }" class="flex items-center gap-2">
          <span
            class="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white"
            >M</span
          >
          <span class="text-lg font-bold tracking-tight text-slate-900">MotoDeals</span>
        </router-link>

        <nav class="hidden items-center gap-1 sm:flex">
          <router-link
            :to="{ name: 'inventario' }"
            class="rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
            active-class="!bg-indigo-50 !text-indigo-700"
          >
            Inventario
          </router-link>
          <router-link
            v-if="auth.tienePermiso('reportes')"
            :to="{ name: 'reportes' }"
            class="rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
            active-class="!bg-indigo-50 !text-indigo-700"
          >
            Reportes
          </router-link>
        </nav>
      </div>

      <div class="flex items-center gap-3">
        <div class="hidden text-right sm:block">
          <p class="text-sm font-medium text-slate-900">{{ auth.firebaseUser?.email }}</p>
          <p class="text-xs text-slate-500">{{ etiquetaRol[auth.perfil?.rol ?? ''] }}</p>
        </div>
        <button
          type="button"
          class="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          @click="cerrarSesion"
        >
          Salir
        </button>
      </div>
    </div>
  </header>
</template>
