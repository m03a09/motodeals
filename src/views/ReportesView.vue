<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useProductosStore, calcularGanancia, type Producto } from '@/stores/productos'

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

const vendidos = computed(() => productosStore.productos.filter((p) => p.estado === 'vendido'))

function totalMejoras(p: Producto) {
  return p.ingreso.mejoras.reduce((acc, m) => acc + m.valor, 0)
}

function totalComisiones(p: Producto) {
  return p.salida?.comisiones.reduce((acc, c) => acc + c.valor, 0) ?? 0
}

function nombreProducto(p: Producto) {
  return (p.detalles.marca ?? p.detalles.nombre ?? '—') + (p.detalles.modelo ? ` ${p.detalles.modelo}` : '')
}

const totalVentas = computed(() => vendidos.value.reduce((acc, p) => acc + (p.salida?.valor_venta ?? 0), 0))
const totalGanancia = computed(() =>
  vendidos.value.reduce((acc, p) => acc + (calcularGanancia(p) ?? 0), 0),
)

const formatoMoneda = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})
</script>

<template>
  <div class="reportes">
    <header>
      <h1>Reportes</h1>
      <router-link :to="{ name: 'inventario' }">← Volver al inventario</router-link>
    </header>

    <p v-if="!auth.clienteId" class="aviso">
      Tu cuenta (superadmin) no pertenece a ningún cliente, así que no hay un inventario del cual
      sacar reportes.
    </p>

    <template v-else>
      <div class="resumen">
        <div class="tarjeta">
          <span class="etiqueta">Vehículos vendidos</span>
          <span class="valor">{{ vendidos.length }}</span>
        </div>
        <div class="tarjeta">
          <span class="etiqueta">Valor total vendido</span>
          <span class="valor">{{ formatoMoneda.format(totalVentas) }}</span>
        </div>
        <div class="tarjeta">
          <span class="etiqueta">Ganancia total</span>
          <span class="valor">{{ formatoMoneda.format(totalGanancia) }}</span>
        </div>
      </div>

      <p v-if="vendidos.length === 0">Todavía no se ha registrado ninguna venta.</p>

      <table v-else>
        <thead>
          <tr>
            <th>Vehículo</th>
            <th>Valor entrada</th>
            <th>Mejoras</th>
            <th>Valor venta</th>
            <th>Comisiones</th>
            <th>Ganancia</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in vendidos" :key="p.id">
            <td>{{ nombreProducto(p) }}</td>
            <td>{{ formatoMoneda.format(p.ingreso.valor_entrada) }}</td>
            <td>{{ formatoMoneda.format(totalMejoras(p)) }}</td>
            <td>{{ formatoMoneda.format(p.salida?.valor_venta ?? 0) }}</td>
            <td>{{ formatoMoneda.format(totalComisiones(p)) }}</td>
            <td class="ganancia">{{ formatoMoneda.format(calcularGanancia(p) ?? 0) }}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td colspan="3">Totales</td>
            <td>{{ formatoMoneda.format(totalVentas) }}</td>
            <td></td>
            <td class="ganancia">{{ formatoMoneda.format(totalGanancia) }}</td>
          </tr>
        </tfoot>
      </table>
    </template>
  </div>
</template>

<style scoped>
.reportes {
  max-width: 900px;
  margin: 0 auto;
  padding: 1.5rem;
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.resumen {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.tarjeta {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 1rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  min-width: 160px;
}

.etiqueta {
  font-size: 0.85rem;
  color: #666;
}

.valor {
  font-size: 1.4rem;
  font-weight: bold;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  text-align: left;
  padding: 0.5rem;
  border-bottom: 1px solid #eee;
}

tfoot td {
  font-weight: bold;
  border-top: 2px solid #333;
  border-bottom: none;
}

.ganancia {
  font-weight: bold;
  color: #1e7e34;
}

.aviso {
  color: #c0392b;
}
</style>
