<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useProductosStore, calcularGanancia } from '@/stores/productos'

const auth = useAuthStore()
const productosStore = useProductosStore()
const router = useRouter()

onMounted(() => {
  if (auth.clienteId) {
    productosStore.escucharProductos(auth.clienteId)
  }
})

onUnmounted(() => {
  productosStore.detenerEscucha()
})

async function cerrarSesion() {
  await auth.logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <div class="inventario">
    <header>
      <h1>Inventario</h1>
      <div>
        <span>{{ auth.firebaseUser?.email }} · {{ auth.perfil?.rol }}</span>
        <button @click="cerrarSesion">Salir</button>
      </div>
    </header>

    <p v-if="auth.esSuperAdmin">
      Eres superadmin. Esta vista muestra el inventario de un cliente específico; aún no hay un
      selector de clientes para el panel de superadmin.
    </p>

    <nav class="acciones">
      <router-link v-if="auth.tienePermiso('crear_editar')" to="/productos/nuevo">
        + Agregar producto
      </router-link>
      <router-link v-if="auth.tienePermiso('reportes')" :to="{ name: 'reportes' }">
        Ver reportes
      </router-link>
    </nav>

    <p v-if="productosStore.cargando">Cargando...</p>
    <p v-else-if="productosStore.productos.length === 0">Sin productos todavía.</p>

    <ul v-else>
      <li v-for="producto in productosStore.productos" :key="producto.id">
        <router-link :to="{ name: 'producto-editar', params: { id: producto.id } }">
          <strong>{{ producto.detalles.marca ?? producto.detalles.nombre }}</strong>
          — {{ producto.estado }}
          <span v-if="producto.salida">· ganancia: {{ calcularGanancia(producto) }}</span>
        </router-link>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.inventario {
  max-width: 720px;
  margin: 0 auto;
  padding: 1.5rem;
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.acciones {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}
</style>
