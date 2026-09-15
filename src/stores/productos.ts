import { ref } from 'vue'
import { defineStore } from 'pinia'
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '@/firebase/config'

export type TipoProducto = 'vehiculo' | 'articulo' | 'venta_terceros'
export type EstadoProducto = 'disponible' | 'vendido'

export interface Mejora {
  descripcion: string
  valor: number
}

export interface Comision {
  concepto: string
  valor: number
}

export interface Ingreso {
  valor_entrada: number
  mejoras: Mejora[]
  fecha_ingreso: Timestamp
}

export interface Salida {
  valor_venta: number
  comisiones: Comision[]
  fecha_salida: Timestamp
}

// detalles: vehiculo -> { marca, modelo, placa, referencia, color }
//           articulo -> { nombre, marca, categoria, talla }
//           venta_terceros -> { marca, modelo, placa, referencia, color, propietario }
//             (el cliente no compra la moto, solo la intermedia para el dueño real;
//              ingreso.valor_entrada queda en 0 y salida.valor_venta representa su
//              comisión cobrada, de la que a su vez se descuentan comisiones como "eymar")
export type Detalles = Record<string, string | number>

export interface Producto {
  id: string
  tipo: TipoProducto
  estado: EstadoProducto
  ingreso: Ingreso
  salida?: Salida
  detalles: Detalles
}

export interface NuevoProductoInput {
  tipo: TipoProducto
  valor_entrada: number
  mejoras?: Mejora[]
  detalles: Detalles
}

export interface VentaInput {
  valor_venta: number
  comisiones?: Comision[]
}

/** ganancia = valor_venta - valor_entrada - suma(mejoras) - suma(comisiones) */
export function calcularGanancia(producto: Producto): number | null {
  if (!producto.salida) return null
  const totalMejoras = producto.ingreso.mejoras.reduce((acc, m) => acc + m.valor, 0)
  const totalComisiones = producto.salida.comisiones.reduce((acc, c) => acc + c.valor, 0)
  return producto.salida.valor_venta - producto.ingreso.valor_entrada - totalMejoras - totalComisiones
}

export const useProductosStore = defineStore('productos', () => {
  const productos = ref<Producto[]>([])
  const cargando = ref(false)
  const error = ref<string | null>(null)

  let unsubscribe: Unsubscribe | null = null

  function coleccionProductos(clienteId: string) {
    return collection(db, 'clientes', clienteId, 'productos')
  }

  // Escucha en tiempo real los productos del cliente. Llamar de nuevo (con otro clienteId)
  // reemplaza el listener anterior; dejar de escuchar con detenerEscucha().
  function escucharProductos(clienteId: string) {
    detenerEscucha()
    cargando.value = true
    unsubscribe = onSnapshot(
      coleccionProductos(clienteId),
      (snap) => {
        productos.value = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Producto)
        cargando.value = false
      },
      (err) => {
        error.value = err.message
        cargando.value = false
      },
    )
  }

  function detenerEscucha() {
    if (unsubscribe) {
      unsubscribe()
      unsubscribe = null
    }
  }

  async function agregarProducto(clienteId: string, input: NuevoProductoInput) {
    await addDoc(coleccionProductos(clienteId), {
      tipo: input.tipo,
      estado: 'disponible',
      ingreso: {
        valor_entrada: input.valor_entrada,
        mejoras: input.mejoras ?? [],
        fecha_ingreso: serverTimestamp(),
      },
      detalles: input.detalles,
    })
  }

  async function editarProducto(
    clienteId: string,
    productoId: string,
    cambios: Partial<Pick<NuevoProductoInput, 'detalles'>> & {
      valor_entrada?: number
      mejoras?: Mejora[]
    },
  ) {
    const data: Record<string, unknown> = {}
    if (cambios.detalles) data.detalles = cambios.detalles
    if (cambios.valor_entrada !== undefined) data['ingreso.valor_entrada'] = cambios.valor_entrada
    if (cambios.mejoras) data['ingreso.mejoras'] = cambios.mejoras
    await updateDoc(doc(db, 'clientes', clienteId, 'productos', productoId), data)
  }

  async function marcarVendido(clienteId: string, productoId: string, venta: VentaInput) {
    await updateDoc(doc(db, 'clientes', clienteId, 'productos', productoId), {
      estado: 'vendido',
      salida: {
        valor_venta: venta.valor_venta,
        comisiones: venta.comisiones ?? [],
        fecha_salida: serverTimestamp(),
      },
    })
  }

  async function eliminarProducto(clienteId: string, productoId: string) {
    await deleteDoc(doc(db, 'clientes', clienteId, 'productos', productoId))
  }

  // Usa el que ya esté cargado en memoria (ej. viniendo del listado); si no, lo trae puntualmente.
  async function obtenerProducto(clienteId: string, productoId: string): Promise<Producto | null> {
    const existente = productos.value.find((p) => p.id === productoId)
    if (existente) return existente
    const snap = await getDoc(doc(db, 'clientes', clienteId, 'productos', productoId))
    return snap.exists() ? ({ id: snap.id, ...snap.data() } as Producto) : null
  }

  return {
    productos,
    cargando,
    error,
    escucharProductos,
    detenerEscucha,
    agregarProducto,
    editarProducto,
    marcarVendido,
    eliminarProducto,
    obtenerProducto,
  }
})
