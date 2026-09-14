<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import {
  useProductosStore,
  type TipoProducto,
  type Mejora,
  type Comision,
  type Producto,
} from '@/stores/productos'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const productosStore = useProductosStore()

const productoId = computed(() => route.params.id as string | undefined)
const modoEdicion = computed(() => productoId.value !== undefined)

const CAMPOS_DETALLES: Record<TipoProducto, string[]> = {
  vehiculo: ['marca', 'modelo', 'placa', 'kilometraje'],
  articulo: ['nombre', 'marca', 'categoria', 'talla'],
}

const cargando = ref(false)
const guardando = ref(false)
const error = ref<string | null>(null)
const productoOriginal = ref<Producto | null>(null)

const tipo = ref<TipoProducto>('vehiculo')
const valorEntrada = ref<number>(0)
const mejoras = ref<Mejora[]>([])
const detalles = ref<Record<string, string>>({})

function inicializarDetalles() {
  const campos: Record<string, string> = {}
  for (const campo of CAMPOS_DETALLES[tipo.value]) {
    campos[campo] = detalles.value[campo] ?? ''
  }
  detalles.value = campos
}

inicializarDetalles()

function agregarMejora() {
  mejoras.value.push({ descripcion: '', valor: 0 })
}

function quitarMejora(index: number) {
  mejoras.value.splice(index, 1)
}

onMounted(async () => {
  if (!modoEdicion.value || !auth.clienteId) return

  cargando.value = true
  try {
    const producto = await productosStore.obtenerProducto(auth.clienteId, productoId.value!)
    if (!producto) {
      error.value = 'El producto no existe.'
      return
    }
    productoOriginal.value = producto
    tipo.value = producto.tipo
    valorEntrada.value = producto.ingreso.valor_entrada
    mejoras.value = [...producto.ingreso.mejoras]
    detalles.value = { ...producto.detalles } as Record<string, string>
    inicializarDetalles()
  } finally {
    cargando.value = false
  }
})

async function guardar() {
  if (!auth.clienteId) return
  guardando.value = true
  error.value = null
  try {
    if (modoEdicion.value) {
      await productosStore.editarProducto(auth.clienteId, productoId.value!, {
        detalles: detalles.value,
        valor_entrada: valorEntrada.value,
        mejoras: mejoras.value,
      })
    } else {
      await productosStore.agregarProducto(auth.clienteId, {
        tipo: tipo.value,
        valor_entrada: valorEntrada.value,
        mejoras: mejoras.value,
        detalles: detalles.value,
      })
    }
    router.push({ name: 'inventario' })
  } catch (e) {
    error.value = 'No se pudo guardar el producto.'
    console.error(e)
  } finally {
    guardando.value = false
  }
}

// --- Registrar venta (solo en edición, si el producto sigue disponible) ---
const mostrarVenta = ref(false)
const valorVenta = ref<number>(0)
const comisiones = ref<Comision[]>([])

function abrirVenta() {
  // Precarga las comisiones por defecto del cliente (ej. "eymar": 50.000) para no
  // tener que escribirlas a mano en cada venta; el usuario puede editarlas o quitarlas,
  // y agregar la comisión "por fuera" cuando aplique.
  comisiones.value = (auth.clienteConfig?.comisiones_default ?? []).map((c) => ({ ...c }))
  mostrarVenta.value = true
}

function agregarComision() {
  comisiones.value.push({ concepto: '', valor: 0 })
}

function quitarComision(index: number) {
  comisiones.value.splice(index, 1)
}

async function registrarVenta() {
  if (!auth.clienteId || !productoId.value) return
  guardando.value = true
  error.value = null
  try {
    await productosStore.marcarVendido(auth.clienteId, productoId.value, {
      valor_venta: valorVenta.value,
      comisiones: comisiones.value,
    })
    router.push({ name: 'inventario' })
  } catch (e) {
    error.value = 'No se pudo registrar la venta.'
    console.error(e)
  } finally {
    guardando.value = false
  }
}

const inputClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30'
</script>

<template>
  <div class="mx-auto max-w-2xl px-4 py-8 sm:px-6">
    <div class="mb-6 flex items-center gap-3">
      <router-link
        :to="{ name: 'inventario' }"
        class="rounded-md p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
        aria-label="Volver al inventario"
      >
        ←
      </router-link>
      <h1 class="text-2xl font-bold text-slate-900">
        {{ modoEdicion ? 'Editar producto' : 'Agregar producto' }}
      </h1>
    </div>

    <p v-if="!auth.clienteId" class="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
      Tu cuenta (superadmin) no pertenece a ningún cliente, así que no hay un inventario donde
      guardar este producto. Ingresa con la cuenta de un cliente para agregar o editar productos.
    </p>

    <p v-else-if="cargando" class="text-slate-500">Cargando...</p>

    <form
      v-else
      class="flex flex-col gap-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      @submit.prevent="guardar"
    >
      <label class="flex flex-col gap-1.5">
        <span class="text-sm font-medium text-slate-700">Tipo</span>
        <select
          v-model="tipo"
          :disabled="modoEdicion"
          class="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 disabled:bg-slate-100 disabled:text-slate-500"
          @change="inicializarDetalles"
        >
          <option value="vehiculo">Vehículo</option>
          <option value="articulo">Artículo</option>
        </select>
      </label>

      <fieldset class="rounded-lg border border-slate-200 p-4">
        <legend class="px-1 text-sm font-semibold text-slate-700">Detalles</legend>
        <div class="grid gap-4 sm:grid-cols-2">
          <label v-for="campo in CAMPOS_DETALLES[tipo]" :key="campo" class="flex flex-col gap-1.5">
            <span class="text-sm font-medium capitalize text-slate-700">{{ campo }}</span>
            <input v-model="detalles[campo]" type="text" :class="inputClass" />
          </label>
        </div>
      </fieldset>

      <label class="flex flex-col gap-1.5">
        <span class="text-sm font-medium text-slate-700">Valor de entrada</span>
        <input v-model.number="valorEntrada" type="number" min="0" required :class="inputClass" />
      </label>

      <fieldset class="rounded-lg border border-slate-200 p-4">
        <legend class="px-1 text-sm font-semibold text-slate-700">Mejoras</legend>
        <div v-for="(mejora, i) in mejoras" :key="i" class="mb-2 flex gap-2">
          <input
            v-model="mejora.descripcion"
            type="text"
            placeholder="Descripción"
            :class="inputClass"
          />
          <input
            v-model.number="mejora.valor"
            type="number"
            min="0"
            placeholder="Valor"
            class="w-32 shrink-0"
            :class="inputClass"
          />
          <button
            type="button"
            class="shrink-0 rounded-lg border border-slate-300 px-2.5 text-slate-500 transition hover:bg-red-50 hover:text-red-600"
            @click="quitarMejora(i)"
          >
            ✕
          </button>
        </div>
        <button
          type="button"
          class="mt-1 text-sm font-medium text-indigo-600 hover:text-indigo-700"
          @click="agregarMejora"
        >
          + Agregar mejora
        </button>
      </fieldset>

      <p v-if="error" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{{ error }}</p>

      <div class="flex items-center gap-3">
        <button
          type="submit"
          :disabled="guardando"
          class="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {{ guardando ? 'Guardando...' : 'Guardar' }}
        </button>
        <router-link
          :to="{ name: 'inventario' }"
          class="text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          Cancelar
        </router-link>
      </div>
    </form>

    <template
      v-if="modoEdicion && productoOriginal?.estado === 'disponible' && auth.tienePermiso('ventas')"
    >
      <div class="my-6 border-t border-slate-200" />

      <button
        v-if="!mostrarVenta"
        type="button"
        class="w-full rounded-xl border border-dashed border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
        @click="abrirVenta"
      >
        Registrar venta
      </button>

      <form
        v-else
        class="flex flex-col gap-5 rounded-xl border border-emerald-200 bg-emerald-50/40 p-6 shadow-sm"
        @submit.prevent="registrarVenta"
      >
        <h2 class="text-lg font-bold text-slate-900">Registrar venta</h2>

        <label class="flex flex-col gap-1.5">
          <span class="text-sm font-medium text-slate-700">Valor de venta</span>
          <input
            v-model.number="valorVenta"
            type="number"
            min="0"
            required
            class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
          />
        </label>

        <fieldset class="rounded-lg border border-slate-200 bg-white p-4">
          <legend class="px-1 text-sm font-semibold text-slate-700">Comisiones</legend>
          <div v-for="(comision, i) in comisiones" :key="i" class="mb-2 flex gap-2">
            <input
              v-model="comision.concepto"
              type="text"
              placeholder="Concepto"
              :class="inputClass"
            />
            <input
              v-model.number="comision.valor"
              type="number"
              min="0"
              placeholder="Valor"
              class="w-32 shrink-0"
              :class="inputClass"
            />
            <button
              type="button"
              class="shrink-0 rounded-lg border border-slate-300 px-2.5 text-slate-500 transition hover:bg-red-50 hover:text-red-600"
              @click="quitarComision(i)"
            >
              ✕
            </button>
          </div>
          <button
            type="button"
            class="mt-1 text-sm font-medium text-indigo-600 hover:text-indigo-700"
            @click="agregarComision"
          >
            + Agregar comisión
          </button>
        </fieldset>

        <button
          type="submit"
          :disabled="guardando"
          class="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {{ guardando ? 'Guardando...' : 'Confirmar venta' }}
        </button>
      </form>
    </template>
  </div>
</template>
