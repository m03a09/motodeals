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
</script>

<template>
  <div class="producto-form">
    <h1>{{ modoEdicion ? 'Editar producto' : 'Agregar producto' }}</h1>

    <p v-if="!auth.clienteId" class="error">
      Tu cuenta (superadmin) no pertenece a ningún cliente, así que no hay un inventario donde
      guardar este producto. Ingresa con la cuenta de un cliente para agregar o
      editar productos.
    </p>

    <p v-else-if="cargando">Cargando...</p>

    <form v-else @submit.prevent="guardar">
      <label>
        Tipo
        <select v-model="tipo" :disabled="modoEdicion" @change="inicializarDetalles">
          <option value="vehiculo">Vehículo</option>
          <option value="articulo">Artículo</option>
        </select>
      </label>

      <fieldset>
        <legend>Detalles</legend>
        <label v-for="campo in CAMPOS_DETALLES[tipo]" :key="campo">
          {{ campo }}
          <input v-model="detalles[campo]" type="text" />
        </label>
      </fieldset>

      <label>
        Valor de entrada
        <input v-model.number="valorEntrada" type="number" min="0" required />
      </label>

      <fieldset>
        <legend>Mejoras</legend>
        <div v-for="(mejora, i) in mejoras" :key="i" class="fila">
          <input v-model="mejora.descripcion" type="text" placeholder="Descripción" />
          <input v-model.number="mejora.valor" type="number" min="0" placeholder="Valor" />
          <button type="button" @click="quitarMejora(i)">✕</button>
        </div>
        <button type="button" @click="agregarMejora">+ Agregar mejora</button>
      </fieldset>

      <p v-if="error" class="error">{{ error }}</p>

      <div class="acciones">
        <button type="submit" :disabled="guardando">
          {{ guardando ? 'Guardando...' : 'Guardar' }}
        </button>
        <router-link :to="{ name: 'inventario' }">Cancelar</router-link>
      </div>
    </form>

    <template v-if="modoEdicion && productoOriginal?.estado === 'disponible' && auth.tienePermiso('ventas')">
      <hr />
      <button v-if="!mostrarVenta" type="button" @click="abrirVenta">
        Registrar venta
      </button>

      <form v-else @submit.prevent="registrarVenta">
        <h2>Registrar venta</h2>

        <label>
          Valor de venta
          <input v-model.number="valorVenta" type="number" min="0" required />
        </label>

        <fieldset>
          <legend>Comisiones</legend>
          <div v-for="(comision, i) in comisiones" :key="i" class="fila">
            <input v-model="comision.concepto" type="text" placeholder="Concepto" />
            <input v-model.number="comision.valor" type="number" min="0" placeholder="Valor" />
            <button type="button" @click="quitarComision(i)">✕</button>
          </div>
          <button type="button" @click="agregarComision">+ Agregar comisión</button>
        </fieldset>

        <button type="submit" :disabled="guardando">
          {{ guardando ? 'Guardando...' : 'Confirmar venta' }}
        </button>
      </form>
    </template>
  </div>
</template>

<style scoped>
.producto-form {
  max-width: 480px;
  margin: 0 auto;
  padding: 1.5rem;
}

form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.fila {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.acciones {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.error {
  color: #c0392b;
}
</style>
