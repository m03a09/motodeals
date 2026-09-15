<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import {
  useProductosStore,
  calcularGanancia,
  type Producto,
  type TipoProducto,
} from '@/stores/productos'

const ETIQUETA_TIPO: Record<TipoProducto, string> = {
  vehiculo: 'Vehículo',
  articulo: 'Artículo',
  venta_terceros: 'Venta de terceros',
}

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

// Filtro de rango de fechas (por fecha_salida, o sea la fecha en que se registró la venta).
// Vacío = sin límite en ese extremo.
const fechaInicio = ref('')
const fechaFin = ref('')
// Filtro por tipo de producto. '' = todos.
const tipoFiltro = ref<TipoProducto | ''>('')

function dentroDelRango(p: Producto): boolean {
  if (!p.salida) return false
  const fecha = p.salida.fecha_salida.toDate()
  if (fechaInicio.value && fecha < new Date(`${fechaInicio.value}T00:00:00`)) return false
  if (fechaFin.value && fecha > new Date(`${fechaFin.value}T23:59:59.999`)) return false
  return true
}

const hayFiltro = computed(() => !!(fechaInicio.value || fechaFin.value || tipoFiltro.value))

function limpiarFiltro() {
  fechaInicio.value = ''
  fechaFin.value = ''
  tipoFiltro.value = ''
}

const vendidos = computed(() =>
  productosStore.productos.filter(
    (p) =>
      p.estado === 'vendido' &&
      dentroDelRango(p) &&
      (!tipoFiltro.value || p.tipo === tipoFiltro.value),
  ),
)

function totalMejoras(p: Producto) {
  return p.ingreso.mejoras.reduce((acc, m) => acc + m.valor, 0)
}

function totalComisiones(p: Producto) {
  return p.salida?.comisiones.reduce((acc, c) => acc + c.valor, 0) ?? 0
}

function nombreProducto(p: Producto) {
  return (
    (p.detalles.marca ?? p.detalles.nombre ?? '—') + (p.detalles.modelo ? ` ${p.detalles.modelo}` : '')
  )
}

const totalVentas = computed(() =>
  vendidos.value.reduce((acc, p) => acc + (p.salida?.valor_venta ?? 0), 0),
)
const totalGanancia = computed(() =>
  vendidos.value.reduce((acc, p) => acc + (calcularGanancia(p) ?? 0), 0),
)

const formatoMoneda = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

const formatoFecha = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' })

function fechaVenta(p: Producto) {
  return p.salida ? formatoFecha.format(p.salida.fecha_salida.toDate()) : '—'
}
</script>

<template>
  <div class="mx-auto max-w-4xl px-4 py-8 sm:px-6">
    <h1 class="mb-6 text-2xl font-bold text-slate-900">Reportes</h1>

    <p
      v-if="!auth.clienteId"
      class="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
    >
      Tu cuenta (superadmin) no pertenece a ningún cliente, así que no hay un inventario del cual
      sacar reportes.
    </p>

    <template v-else>
      <div
        class="mb-6 flex flex-wrap items-end gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <label class="flex flex-col gap-1.5">
          <span class="text-sm font-medium text-slate-700">Desde</span>
          <input
            v-model="fechaInicio"
            type="date"
            class="rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
          />
        </label>
        <label class="flex flex-col gap-1.5">
          <span class="text-sm font-medium text-slate-700">Hasta</span>
          <input
            v-model="fechaFin"
            type="date"
            class="rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
          />
        </label>
        <label class="flex flex-col gap-1.5">
          <span class="text-sm font-medium text-slate-700">Tipo</span>
          <select
            v-model="tipoFiltro"
            class="rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
          >
            <option value="">Todos</option>
            <option v-for="(etiqueta, key) in ETIQUETA_TIPO" :key="key" :value="key">
              {{ etiqueta }}
            </option>
          </select>
        </label>

        <button
          v-if="hayFiltro"
          type="button"
          class="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          @click="limpiarFiltro"
        >
          Limpiar filtro
        </button>
      </div>

      <div class="mb-8 grid gap-4 sm:grid-cols-3">
        <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p class="text-sm text-slate-500">Vehículos vendidos</p>
          <p class="mt-1 text-2xl font-bold text-slate-900">{{ vendidos.length }}</p>
        </div>
        <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p class="text-sm text-slate-500">Valor total vendido</p>
          <p class="mt-1 text-2xl font-bold text-slate-900">
            {{ formatoMoneda.format(totalVentas) }}
          </p>
        </div>
        <div class="rounded-xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
          <p class="text-sm text-emerald-700">Ganancia total</p>
          <p class="mt-1 text-2xl font-bold text-emerald-700">
            {{ formatoMoneda.format(totalGanancia) }}
          </p>
        </div>
      </div>

      <div
        v-if="vendidos.length === 0"
        class="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center text-slate-500"
      >
        {{
          hayFiltro
            ? 'No hay ventas que coincidan con ese filtro.'
            : 'Todavía no se ha registrado ninguna venta.'
        }}
      </div>

      <div v-else class="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
              <th class="px-4 py-3 font-medium">Vehículo</th>
              <th class="px-4 py-3 font-medium">Fecha venta</th>
              <th class="px-4 py-3 font-medium">Tipo</th>
              <th class="px-4 py-3 font-medium">Valor entrada</th>
              <th class="px-4 py-3 font-medium">Mejoras</th>
              <th class="px-4 py-3 font-medium">Valor venta</th>
              <th class="px-4 py-3 font-medium">Comisiones</th>
              <th class="px-4 py-3 font-medium">Ganancia</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="p in vendidos"
              :key="p.id"
              class="border-b border-slate-100 last:border-0 hover:bg-slate-50"
            >
              <td class="px-4 py-3 font-medium text-slate-900">{{ nombreProducto(p) }}</td>
              <td class="px-4 py-3 text-slate-600">{{ fechaVenta(p) }}</td>
              <td class="px-4 py-3 text-slate-600">{{ ETIQUETA_TIPO[p.tipo] }}</td>
              <td class="px-4 py-3 text-slate-600">
                {{ formatoMoneda.format(p.ingreso.valor_entrada) }}
              </td>
              <td class="px-4 py-3 text-slate-600">{{ formatoMoneda.format(totalMejoras(p)) }}</td>
              <td class="px-4 py-3 text-slate-600">
                {{ formatoMoneda.format(p.salida?.valor_venta ?? 0) }}
              </td>
              <td class="px-4 py-3 text-slate-600">
                {{ formatoMoneda.format(totalComisiones(p)) }}
              </td>
              <td class="px-4 py-3 font-semibold text-emerald-700">
                {{ formatoMoneda.format(calcularGanancia(p) ?? 0) }}
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="border-t-2 border-slate-300 font-semibold text-slate-900">
              <td class="px-4 py-3" colspan="5">Totales</td>
              <td class="px-4 py-3">{{ formatoMoneda.format(totalVentas) }}</td>
              <td class="px-4 py-3"></td>
              <td class="px-4 py-3 text-emerald-700">
                {{ formatoMoneda.format(totalGanancia) }}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </template>
  </div>
</template>
