<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import AppHeader from '@/components/AppHeader.vue'

const auth = useAuthStore()
</script>

<template>
  <div class="min-h-screen bg-slate-50">
    <AppHeader v-if="auth.estaAutenticado" />
    <router-view />
  </div>
</template>
