import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '@/firebase/config'

export type Rol = 'superadmin' | 'cliente'

export interface Permisos {
  ver: boolean
  crear_editar: boolean
  ventas: boolean
  reportes: boolean
  usuarios: boolean
}

export interface PerfilUsuario {
  clienteId: string | null
  rol: Rol
  permisos?: Permisos
}

export interface ComisionDefault {
  concepto: string
  valor: number
}

export interface ClienteConfig {
  comisiones_default: ComisionDefault[]
}

export const useAuthStore = defineStore('auth', () => {
  const firebaseUser = ref<User | null>(null)
  const perfil = ref<PerfilUsuario | null>(null)
  const clienteConfig = ref<ClienteConfig | null>(null)
  const cargando = ref(true) // true mientras no se resuelve el estado inicial de auth
  const error = ref<string | null>(null)

  const estaAutenticado = computed(() => firebaseUser.value !== null && perfil.value !== null)
  const esSuperAdmin = computed(() => perfil.value?.rol === 'superadmin')
  const clienteId = computed(() => perfil.value?.clienteId ?? null)
  const permisos = computed(() => perfil.value?.permisos ?? null)

  function tienePermiso(permiso: keyof Permisos): boolean {
    if (esSuperAdmin.value) return true
    return permisos.value?.[permiso] === true
  }

  async function cargarPerfil(uid: string) {
    const snap = await getDoc(doc(db, 'usuarios', uid))
    perfil.value = snap.exists() ? (snap.data() as PerfilUsuario) : null

    if (perfil.value?.clienteId) {
      try {
        const clienteSnap = await getDoc(doc(db, 'clientes', perfil.value.clienteId))
        clienteConfig.value = clienteSnap.exists()
          ? ((clienteSnap.data().config as ClienteConfig) ?? { comisiones_default: [] })
          : null
      } catch (e) {
        console.error('No se pudo cargar la configuración del cliente:', e)
        clienteConfig.value = null
      }
    } else {
      clienteConfig.value = null
    }
  }

  // Se llama una vez al arrancar la app (ver main.ts) para escuchar cambios de sesión.
  function iniciarListener() {
    onAuthStateChanged(auth, async (user) => {
      firebaseUser.value = user
      try {
        if (user) {
          await cargarPerfil(user.uid)
        } else {
          perfil.value = null
        }
      } finally {
        cargando.value = false
      }
    })
  }

  async function login(email: string, password: string) {
    error.value = null
    try {
      const credencial = await signInWithEmailAndPassword(auth, email, password)
      // Cargamos el perfil aquí mismo (no esperamos a onAuthStateChanged) para que,
      // cuando login() resuelva, estaAutenticado ya sea true y no haya carrera con el guard.
      await cargarPerfil(credencial.user.uid)
      firebaseUser.value = credencial.user
    } catch (e) {
      error.value = 'Correo o contraseña incorrectos.'
      throw e
    }
  }

  async function logout() {
    await signOut(auth)
  }

  return {
    firebaseUser,
    perfil,
    clienteConfig,
    cargando,
    error,
    estaAutenticado,
    esSuperAdmin,
    clienteId,
    permisos,
    tienePermiso,
    iniciarListener,
    login,
    logout,
  }
})
