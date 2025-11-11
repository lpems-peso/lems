// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  css: ['./app/assets/css/main.css'],
  vite: {
    plugins: [
      tailwindcss(),
    ],
  },

  modules: ['@nuxt/ui', '@nuxtjs/supabase', '@vueuse/nuxt', '@nuxthub/core'],

  supabase: {
    types: '~/server/database.types.ts',
    redirectOptions: { // Note: redirectOptions instead of redirect
      login: '/login',
      callback: '/callback'
    }
  },

  vueuse: {
    ssrHandlers: true,
  },

  runtimeConfig: {
    supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,},

     nitro: {
    preset: 'cloudflare_module'
  },

})