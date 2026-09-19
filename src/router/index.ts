import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { publica: true },
    },
    {
      path: '/',
      name: 'inventario',
      component: () => import('@/views/InventarioView.vue'),
      meta: { permiso: 'ver' },
    },
    {
      path: '/productos/nuevo',
      name: 'producto-nuevo',
      component: () => import('@/views/ProductoFormView.vue'),
      meta: { permiso: 'crear_editar' },
    },
    {
      path: '/productos/:id/editar',
      name: 'producto-editar',
      component: () => import('@/views/ProductoFormView.vue'),
      meta: { permiso: 'crear_editar' },
      props: true,
    },
    {
      path: '/reportes',
      name: 'reportes',
      component: () => import('@/views/ReportesView.vue'),
      meta: { permiso: 'reportes' },
    },
    {
      path: '/prueba-vencida',
      name: 'prueba-vencida',
      component: () => import('@/views/PruebaVencidaView.vue'),
    },
  ],
})

// Espera a que se resuelva el estado inicial de sesión (onAuthStateChanged es async)
// antes de decidir si deja pasar o redirige. Sin esto, al recargar la página el guard
// vería "no autenticado" por una fracción de segundo aunque sí haya sesión.
function esperarAuthListo(auth: ReturnType<typeof useAuthStore>) {
  if (!auth.cargando) return Promise.resolve()
  return new Promise<void>((resolve) => {
    const detener = auth.$subscribe(() => {
      if (!auth.cargando) {
        detener()
        resolve()
      }
    })
  })
}

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  await esperarAuthListo(auth)

  if (!to.meta.publica && !auth.estaAutenticado) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (to.name === 'login' && auth.estaAutenticado) {
    return auth.pruebaVencida ? { name: 'prueba-vencida' } : { name: 'inventario' }
  }

  // Cliente con la prueba vencida: no ve nada de la app salvo la pantalla de aviso.
  if (auth.estaAutenticado && auth.pruebaVencida && to.name !== 'prueba-vencida') {
    return { name: 'prueba-vencida' }
  }
  if (to.name === 'prueba-vencida' && auth.estaAutenticado && !auth.pruebaVencida) {
    return { name: 'inventario' }
  }

  const permisoRequerido = to.meta.permiso as string | undefined
  if (permisoRequerido && !auth.esSuperAdmin && !auth.tienePermiso(permisoRequerido as never)) {
    return { name: 'inventario' }
  }

  return true
})

export default router
