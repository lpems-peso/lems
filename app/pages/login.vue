<script setup lang="ts">
import { ref } from 'vue'
import { useSupabaseClient, useSupabaseUser } from '#imports'
import { navigateTo } from '#app'
import Swal from 'sweetalert2'

// --- Supabase client & user ---
const client = useSupabaseClient()
const supabaseUser = useSupabaseUser()

// --- User table type ---
interface UserData {
  id: string
  auth_id: string
  email: string
  role: 'admin' | 'trainer' | 'user' | 'trainee'
  full_name: string | null
  status: string | null
  created_at: string
  updated_at: string
}

// --- Reactive variables ---
const email = ref('')
const password = ref('')
const message = ref('')
const success = ref(false)
const loading = ref(false)
const userDataRef = ref<UserData | null>(null)

// --- Redirect helper ---
function redirectByRole(role: string) {
  role = role.toLowerCase()
  if (role === 'admin') navigateTo('/admin/user-management')
  else if (role === 'trainer') navigateTo('/trainer/dashboard')
  else navigateTo('/trainee/dashboard')
}

// --- Login function ---
async function handleLogin() {
  if (!email.value || !password.value) {
    Swal.fire('⚠️ Missing Fields', 'Email and password are required.', 'warning')
    return
  }

  loading.value = true
  message.value = ''
  success.value = false

  try {
    // --- Step 1: Login with Supabase Auth ---
    const { data: authData, error: authError } = await client.auth.signInWithPassword({
      email: email.value.trim(),
      password: password.value
    })

    if (authError) {
      Swal.fire('❌ Login Failed', authError.message, 'error')
      message.value = authError.message
      loading.value = false
      return
    }

    if (!authData.user || !authData.user.email) {
      Swal.fire('❌ Login Failed', 'No user returned from Auth.', 'error')
      message.value = 'Login failed. No user returned from Auth.'
      loading.value = false
      return
    }

    const userEmail = authData.user.email

    // --- Step 2: Check if user exists in `users` table ---
    const { data: userData, error: fetchError } = await client
      .from('users')
      .select('*')
      .eq('email', userEmail)
      .maybeSingle()

    if (fetchError) {
      console.error('Error fetching user:', fetchError)
      Swal.fire('❌ Error', 'Failed to fetch user profile. Please try again.', 'error')
      message.value = 'Failed to fetch user profile. Please try again.'
      loading.value = false
      return
    }

    console.log('📊 User data from DB:', userData)

    // --- Step 3: Insert Auth user into `users` table if missing ---
    if (!userData) {
      const newUser = {
        auth_id: authData.user.id,
        email: userEmail,
        full_name: authData.user.user_metadata?.full_name || null,
        role: 'user' as 'admin' | 'trainer' | 'user' | 'trainee',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { data: insertedUser, error: insertError } = await client
        .from('users')
        .insert(newUser)
        .select()
        .single()

      if (insertError) {
        console.error('Failed to insert user:', insertError)
        Swal.fire('❌ Error', 'Failed to create user profile. Contact admin.', 'error')
        message.value = 'Failed to create user profile. Contact admin.'
        await client.auth.signOut()
        loading.value = false
        return
      }

      userDataRef.value = insertedUser
      console.log('✅ Auth user inserted into users table')
    } else {
      userDataRef.value = userData
    }

    // --- Step 4: Auto-redirect based on role ---
    const finalUserData = userDataRef.value
    if (finalUserData && finalUserData.role) {
      success.value = true
      message.value = `Welcome back, ${finalUserData.full_name || 'User'}! Redirecting...`
      
      // Show brief success message then auto-redirect
      Swal.fire({
        icon: 'success',
        title: '✅ Login Successful',
        html: `Welcome back, ${finalUserData.full_name || 'User'}!<br>Redirecting to your dashboard...`,
        timer: 1500,
        showConfirmButton: false,
        timerProgressBar: true
      }).then(() => {
        redirectByRole(finalUserData.role)
      })
    } else {
      Swal.fire('❌ Error', 'User data incomplete. Please contact support.', 'error')
      message.value = 'User data incomplete. Please contact support.'
      console.error('Missing user data or role:', userDataRef.value)
    }

  } catch (err) {
    console.error('Login error:', err)
    Swal.fire('❌ Error', 'An unexpected error occurred. Please try again.', 'error')
    message.value = 'An unexpected error occurred. Please try again.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center relative overflow-hidden bg-gray-50">
    <div class="absolute inset-0 bg-white/10 backdrop-blur-sm rotate-[-5deg] scale-110"></div>

    <div class="relative flex flex-col md:flex-row bg-white rounded-2xl shadow-2xl overflow-hidden w-[90%] max-w-4xl z-10">
      <!-- Left Image -->
      <div class="flex-1 flex items-center justify-center p-10">
        <img src="/image/logo.png" alt="Logo" class="w-60 md:w-72 object-contain" />
      </div>

      <!-- Login Form -->
      <div class="flex-1 bg-[#2c3e50] p-10 flex flex-col justify-center">
        <h2 class="text-3xl font-bold mb-6 text-white text-center">Login</h2>

        <p
          v-if="message"
          :class="success ? 'text-green-400' : 'text-red-500'"
          class="text-center mb-4 font-medium"
        >
          {{ message }}
        </p>

        <form @submit.prevent="handleLogin" class="space-y-5">
          <div>
            <label class="block text-sm font-semibold text-white mb-1">Email Address</label>
            <input
              v-model="email"
              type="email"
              required
              placeholder="Enter your email"
              :disabled="loading"
              class="bg-white w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          <div>
            <label class="block text-sm font-semibold text-white mb-1">Password</label>
            <input
              v-model="password"
              type="password"
              required
              placeholder="Enter your password"
              :disabled="loading"
              class="bg-white w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          <div class="flex justify-center">
            <button
              type="submit"
              :disabled="loading"
              class="w-40 bg-[#1abc9c] hover:bg-[#16a085] text-white py-2 rounded-lg font-semibold transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <span v-if="loading" class="loader-border border-white w-5 h-5 rounded-full animate-spin"></span>
              {{ loading ? 'Logging in...' : 'Login' }}
            </button>
          </div>
        </form>

        <div class="text-center mt-6">
          <p class="text-gray-300 text-sm">Don't have an account?</p>
          <NuxtLink to="/register" class="text-[#1abc9c] hover:underline font-semibold">
            Register here
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.loader-border {
  border: 2px solid transparent;
  border-top-color: white;
  border-right-color: white;
}
</style>