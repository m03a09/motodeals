<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import MoneyInput from '@/components/MoneyInput.vue'
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

interface ConfigTipo {
  etiqueta: string
  campos: string[]
  // false = el cliente no compra el producto (ej. venta de terceros: solo intermedia),
  // así que se ocultan "Valor de entrada" y "Mejoras" y quedan en 0/vacío.
  requiereIngreso: boolean
}

// Única fuente de verdad para los tipos de producto: agregar un tipo nuevo aquí
// (y en TipoProducto en stores/productos.ts) es suficiente para que aparezca en el
// select y con sus propios campos — no hay que tocar el resto del formulario.
const TIPOS: Record<TipoProducto, ConfigTipo> = {
  vehiculo: {
    etiqueta: 'Vehículo',
    campos: ['marca', 'modelo', 'placa', 'referencia', 'color'],
    requiereIngreso: true,
  },
  articulo: {
    etiqueta: 'Artículo',
    campos: ['nombre', 'marca', 'categoria', 'talla'],
    requiereIngreso: true,
  },
  venta_terceros: {
    etiqueta: 'Venta de terceros',
    campos: ['marca', 'modelo', 'placa', 'referencia', 'color', 'propietario'],
    requiereIngreso: false,
  },
}

const cargando = ref(false)
const guardando = ref(false)
const error = ref<string | null>(null)
const productoOriginal = ref<Producto | null>(null)

const tipo = ref<TipoProducto>('vehiculo')
const valorEntrada = ref<number>(0)
const mejoras = ref<Mejora[]>([])
const detalles = ref<Record<string, string>>({})

const requiereIngreso = computed(() => TIPOS[tipo.value].requiereIngreso)
const etiquetaValorVenta = computed(() =>
  tipo.value === 'venta_terceros' ? 'Comisión cobrada por la venta' : 'Valor de venta',
)

function inicializarDetalles() {
  const campos: Record<string, string> = {}
  for (const campo of TIPOS[tipo.value].campos) {
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
    // En tipos sin ingreso (ej. venta de terceros) el cliente no compra el producto,
    // así que no hay valor de entrada ni mejoras que registrar: se guardan en 0/vacío
    // sin importar lo que haya quedado en el formulario (por si se cambió de tipo).
    const valorEntradaFinal = requiereIngreso.value ? valorEntrada.value : 0
    const mejorasFinal = requiereIngreso.value ? mejoras.value : []

    if (modoEdicion.value) {
      await productosStore.editarProducto(auth.clienteId, productoId.value!, {
        detalles: detalles.value,
        valor_entrada: valorEntradaFinal,
        mejoras: mejorasFinal,
      })
    } else {
      await productosStore.agregarProducto(auth.clienteId, {
        tipo: tipo.value,
        valor_entrada: valorEntradaFinal,
        mejoras: mejorasFinal,
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

// Sin utilidad de ancho: cada input decide su ancho por separado (w-full, flex-1, w-32...)
// para no chocar con esta clase base cuando se combinan (ver filas de mejoras/comisiones).
const inputBase =
  'rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30'
const inputClass = `w-full ${inputBase}`
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
          <option v-for="(cfg, key) in TIPOS" :key="key" :value="key">{{ cfg.etiqueta }}</option>
        </select>
      </label>

      <fieldset class="min-w-0 rounded-lg border border-slate-200 p-4">
        <legend class="px-1 text-sm font-semibold text-slate-700">Detalles</legend>
        <div class="grid gap-4 sm:grid-cols-2">
          <label v-for="campo in TIPOS[tipo].campos" :key="campo" class="flex flex-col gap-1.5">
            <span class="text-sm font-medium capitalize text-slate-700">{{ campo }}</span>
            <input v-model="detalles[campo]" type="text" :class="inputClass" />
          </label>
        </div>
      </fieldset>

      <label v-if="requiereIngreso" class="flex flex-col gap-1.5">
        <span class="text-sm font-medium text-slate-700">Valor de entrada</span>
        <MoneyInput v-model="valorEntrada" required :class="inputClass" />
      </label>

      <fieldset v-if="requiereIngreso" class="min-w-0 rounded-lg border border-slate-200 p-4">
        <legend class="px-1 text-sm font-semibold text-slate-700">Mejoras</legend>
        <div v-for="(mejora, i) in mejoras" :key="i" class="mb-2 flex gap-2">
          <input
            v-model="mejora.descripcion"
            type="text"
            placeholder="Descripción"
            required
            class="min-w-0 flex-1"
            :class="inputBase"
          />
          <MoneyInput
            v-model="mejora.valor"
            placeholder="Valor"
            class="w-32 shrink-0"
            :class="inputBase"
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
          <span class="text-sm font-medium text-slate-700">{{ etiquetaValorVenta }}</span>
          <MoneyInput
            v-model="valorVenta"
            required
            class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
          />
        </label>

        <fieldset class="min-w-0 rounded-lg border border-slate-200 bg-white p-4">
          <legend class="px-1 text-sm font-semibold text-slate-700">Comisiones</legend>
          <div v-for="(comision, i) in comisiones" :key="i" class="mb-2 flex gap-2">
            <input
              v-model="comision.concepto"
              type="text"
              placeholder="Concepto"
              required
              class="min-w-0 flex-1"
              :class="inputBase"
            />
            <MoneyInput
              v-model="comision.valor"
              placeholder="Valor"
              class="w-32 shrink-0"
              :class="inputBase"
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
