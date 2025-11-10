<script setup lang="ts">
import { ref } from 'vue'
import Swal from 'sweetalert2'

// Use Nuxt composables
const supabase = useSupabaseClient()
const router = useRouter()

// form fields
const fullName = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const selectedRole = ref('')
const loading = ref(false)

// SweetAlert2 functions
const showSuccessAlert = (message: string) => {
  return Swal.fire({
    icon: 'success',
    title: 'Success!',
    text: message,
    confirmButtonColor: '#0d9488',
    confirmButtonText: 'OK'
  })
}

const showErrorAlert = (message: string) => {
  return Swal.fire({
    icon: 'error',
    title: 'Oops...',
    text: message,
    confirmButtonColor: '#dc2626',
    confirmButtonText: 'Try Again'
  })
}

const showWarningAlert = (message: string) => {
  return Swal.fire({
    icon: 'warning',
    title: 'Validation Error',
    text: message,
    confirmButtonColor: '#d97706',
    confirmButtonText: 'OK'
  })
}

const showLoadingAlert = () => {
  Swal.fire({
    title: 'Creating Account...',
    text: 'Please wait while we set up your account',
    allowOutsideClick: false,
    didOpen: () => {
      Swal.showLoading()
    }
  })
}

const handleRegister = async () => {
  loading.value = true

  // Validate required fields
  if (!fullName.value || !email.value || !password.value || !confirmPassword.value || !selectedRole.value) {
    await showWarningAlert('Please fill in all required fields')
    loading.value = false
    return
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email.value)) {
    await showWarningAlert('Please enter a valid email address')
    loading.value = false
    return
  }

  // Validate password
  if (password.value !== confirmPassword.value) {
    await showWarningAlert('Passwords do not match. Please make sure both passwords are identical.')
    loading.value = false
    return
  }

  if (password.value.length < 6) {
    await showWarningAlert('Password must be at least 6 characters long')
    loading.value = false
    return
  }

  try {
    showLoadingAlert()

    // Sign up the user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email.value,
      password: password.value,
      options: {
        data: {
          full_name: fullName.value,
          role: selectedRole.value
        },
        emailRedirectTo: `${window.location.origin}/login`
      }
    })

    if (authError) throw authError
    if (!authData.user) throw new Error('User creation failed')

    // Try to insert into users table (handle RLS gracefully)
    try {
      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: email.value,
          full_name: fullName.value,
          role: selectedRole.value,
          created_at: new Date()
        })

      if (userError && !userError.message.includes('row-level security')) {
        throw userError
      }
    } catch (insertError) {
      // Ignore RLS errors, throw others
      if (!insertError.message.includes('row-level security')) {
        throw insertError
      }
    }

    Swal.close()
    await showSuccessAlert('Registration successful! Please check your email to verify your account.')
    router.push('/login')

  } catch (error: any) {
    Swal.close()
    console.error('Registration error:', error)
    
    if (error.message.includes('User already registered')) {
      await showErrorAlert('This email is already registered. Please try logging in instead.')
    } else {
      await showErrorAlert(error.message || 'Registration failed. Please try again.')
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <!-- Your template remains the same -->
  <div class="min-h-screen flex items-center justify-center bg-gray-100 p-4">
    <div class="flex bg-white rounded-lg shadow-xl overflow-hidden max-w-4xl w-full">
      <!-- Left side - Logo -->
      <div class="w-1/2 bg-white flex items-center justify-center p-8">
        <div class="text-center">
          <img 
            src="/image/logo.png" 
            alt="Municipality of San Marcelino Logo" 
            class="w-64 h-64 mx-auto"
          />
        </div>
      </div>

      <!-- Right side - Registration Form -->
      <div class="w-1/2 bg-slate-700 p-12 flex flex-col justify-center">
        <h2 class="text-3xl font-bold text-white mb-8 text-center">Register</h2>
        
        <form @submit.prevent="handleRegister" class="space-y-4">
          <!-- Your form fields remain the same -->
          <div>
            <label class="block text-white text-sm font-medium mb-2">Full Name</label>
            <input
              v-model="fullName"
              type="text"
              required
              class="w-full text-white px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="Enter your full name"
            />
          </div>

          <div>
            <label class="block text-white text-sm font-medium mb-2">Email Address</label>
            <input
              v-model="email"
              type="email"
              required
              class="w-full text-white px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="Enter your email"
            />
          </div>

          <div>
            <label class="block text-white text-sm font-medium mb-2">Password</label>
            <input
              v-model="password"
              type="password"
              required
              minlength="6"
              class="w-full text-white px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="Enter your password (min 6 characters)"
            />
          </div>

          <div>
            <label class="block text-white text-sm font-medium mb-2">Confirm Password</label>
            <input
              v-model="confirmPassword"
              type="password"
              required
              class="w-full text-white px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="Confirm your password"
            />
          </div>

          <div>
            <label class="block text-white text-sm font-medium mb-2">Register As</label>
            <select
              v-model="selectedRole"
              required
              class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="">Select Role</option>
              <option value="trainee">Trainee</option>
              <option value="trainer">Trainer</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <button
            type="submit"
            :disabled="loading"
            class="w-full bg-teal-500 hover:bg-teal-600 text-white font-semibold py-3 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ loading ? 'Creating Account...' : 'Register' }}
          </button>

          <div class="text-center">
            <span class="text-white text-sm">Already have an account? </span>
            <NuxtLink to="/login" class="text-teal-300 hover:text-teal-200 text-sm font-medium">
              Login here
            </NuxtLink>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>