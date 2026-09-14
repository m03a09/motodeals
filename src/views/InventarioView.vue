<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useProductosStore, calcularGanancia } from '@/stores/productos'

const auth = useAuthStore()
const productosStore = useProductosStore()

onMounted(() => {
  if (auth.clienteId) {
    productosStore.escucharProductos(auth.clienteId)
  }
})

onUnmounted(() => {
  productosStore.detenerEscucha()
})

const formatoMoneda = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

const estiloEstado: Record<string, string> = {
  disponible: 'bg-emerald-50 text-emerald-700',
  vendido: 'bg-slate-100 text-slate-600',
}
</script>

<template>
  <div class="mx-auto max-w-5xl px-4 py-8 sm:px-6">
    <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
      <h1 class="text-2xl font-bold text-slate-900">Inventario</h1>

      <div class="flex gap-2">
        <router-link
          v-if="auth.tienePermiso('crear_editar')"
          to="/productos/nuevo"
          class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
        >
          + Agregar producto
        </router-link>
      </div>
    </div>

    <p
      v-if="auth.esSuperAdmin"
      class="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
    >
      Eres superadmin. Esta vista muestra el inventario de un cliente específico; aún no hay un
      selector de clientes para el panel de superadmin.
    </p>

    <p v-if="productosStore.cargando" class="text-slate-500">Cargando...</p>

    <div
      v-else-if="productosStore.productos.length === 0"
      class="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center text-slate-500"
    >
      Sin productos todavía.
    </div>

    <div v-else class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <router-link
        v-for="producto in productosStore.productos"
        :key="producto.id"
        :to="{ name: 'producto-editar', params: { id: producto.id } }"
        class="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-indigo-300 hover:shadow-md"
      >
        <div class="mb-2 flex items-start justify-between gap-2">
          <h2 class="font-semibold text-slate-900">
            {{ producto.detalles.marca ?? producto.detalles.nombre }}
            <span v-if="producto.detalles.modelo" class="font-normal text-slate-500">{{
              producto.detalles.modelo
            }}</span>
          </h2>
          <span
            class="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize"
            :class="estiloEstado[producto.estado]"
          >
            {{ producto.estado }}
          </span>
        </div>

        <p class="text-sm text-slate-500">
          Entrada: {{ formatoMoneda.format(producto.ingreso.valor_entrada) }}
        </p>

        <p v-if="producto.salida" class="mt-1 text-sm font-semibold text-emerald-700">
          Ganancia: {{ formatoMoneda.format(calcularGanancia(producto) ?? 0) }}
        </p>
      </router-link>
    </div>
  </div>
</template>
