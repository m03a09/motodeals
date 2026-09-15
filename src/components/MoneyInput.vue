<script setup lang="ts">
// Input de texto que muestra el número con separador de miles (12.000.000) mientras se
// escribe, pero por fuera (v-model) siempre se comporta como un number plano — así el
// resto del código (stores, cálculos de ganancia, etc.) no tiene que saber que esto existe.
import { ref, watch } from 'vue'

const modelValue = defineModel<number>({ required: true })

function formatear(valor: number): string {
  return valor ? valor.toLocaleString('es-CO') : ''
}

function aNumero(texto: string): number {
  const soloDigitos = texto.replace(/\D/g, '')
  return soloDigitos ? parseInt(soloDigitos, 10) : 0
}

const texto = ref(formatear(modelValue.value))

// Si el valor cambia desde afuera (ej. al cargar un producto existente), refleja el
// cambio en el texto formateado — pero sin pisar lo que el usuario está escribiendo
// si el número no cambió realmente.
watch(modelValue, (nuevo) => {
  if (nuevo !== aNumero(texto.value)) {
    texto.value = formatear(nuevo)
  }
})

function onInput(evento: Event) {
  const input = evento.target as HTMLInputElement
  const numero = aNumero(input.value)
  texto.value = formatear(numero)
  modelValue.value = numero
}
</script>

<template>
  <input type="text" inputmode="numeric" :value="texto" @input="onInput" />
</template>
