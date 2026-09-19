<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

const formatoFecha = new Intl.DateTimeFormat('es-CO', { dateStyle: 'long' })
const fechaVencimiento = computed(() =>
  auth.activoHasta ? formatoFecha.format(auth.activoHasta) : null,
)

async function cerrarSesion() {
  await auth.logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <div class="mx-auto flex min-h-[calc(100vh-57px)] max-w-md flex-col items-center justify-center px-4 py-8 text-center">
    <div class="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-2xl">
      ⏳
    </div>
    <h1 class="mt-4 text-xl font-bold text-slate-900">Tu período de prueba finalizó</h1>
    <p class="mt-2 text-sm text-slate-600">
      <template v-if="fechaVencimiento">Tu acceso venció el {{ fechaVencimiento }}. </template>
      Contacta al administrador de MotoDeals para reactivar tu cuenta y seguir usando la
      aplicación.
    </p>

    <button
      type="button"
      class="mt-6 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
      @click="cerrarSesion"
    >
      Cerrar sesión
    </button>
  </div>
</template>
