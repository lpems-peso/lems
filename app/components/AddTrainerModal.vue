<script setup lang="ts">
import Swal from 'sweetalert2'

const supabase = useSupabaseClient()
const showModal = defineModel<boolean>()
const emit = defineEmits(['update:modelValue', 'added'])

const full_name = ref('')
const email = ref('')
const role = ref('trainer')
const program = ref('')
const generatedPassword = ref('')
const allowMultiplePrograms = ref(false)
const isLoading = ref(false)

const programs = ref<{ id: string; name: string }[]>([])

const selectedProgramName = computed(() => {
  const selected = programs.value.find(p => p.id === program.value)
  return selected ? selected.name : '-'
})

const fetchPrograms = async () => {
  try {
    const { data, error } = await supabase
      .from('programs')
      .select('id, name')
      .order('name')

    if (error) throw error
    programs.value = data || []
  } catch (err) {
    console.error('Error fetching programs:', err)
    Swal.fire('❌ Error', 'Failed to load programs.', 'error')
  }
}

onMounted(fetchPrograms)

function generatePassword(length = 15) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$!'
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

const generateNewPassword = () => {
  generatedPassword.value = generatePassword()
}

const sendWelcomeEmail = async (userEmail: string, password: string, userName: string) => {
  try {
    const { data, error } = await supabase.functions.invoke('send-welcome-email', {
      body: {
        email: userEmail,
        password: password,
        name: userName,
        role: 'trainer'
      }
    })

    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error('Error sending email:', error)
    return { success: false, error }
  }
}

const createAuthUser = async (userEmail: string, password: string) => {
  try {
    // Use service role key directly from environment
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || useRuntimeConfig().public.supabaseServiceKey
    
    if (!serviceRoleKey) {
      throw new Error('Service role key not configured')
    }

    const response = await fetch(`${useRuntimeConfig().public.supabaseUrl}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: userEmail,
        password: password,
        email_confirm: true,
        user_metadata: {
          full_name: full_name.value,
          role: 'trainer'
        }
      })
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.msg || data.message || 'Failed to create user')
    }

    return { success: true, data }
  } catch (error) {
    console.error('Error creating auth user:', error)
    return { success: false, error }
  }
}

const saveTrainer = async () => {
  if (!full_name.value || !email.value) {
    Swal.fire('⚠️ Missing Fields', 'Please fill out all required fields.', 'warning')
    return
  }

  const gmailPattern = /^[a-zA-Z0-9._%+-]+@gmail\.com$/
  if (!gmailPattern.test(email.value)) {
    Swal.fire('⚠️ Invalid Email', 'Please use a valid Gmail address (example@gmail.com).', 'warning')
    return
  }

  if (!generatedPassword.value) generateNewPassword()

  isLoading.value = true

  try {
    // Check for existing users
    const { data: existingUsers, error: checkError } = await supabase
      .from('users')
      .select('id, full_name, email')
      .or(`full_name.eq.${full_name.value},email.eq.${email.value}`)

    if (checkError) throw checkError

    if (existingUsers && existingUsers.length > 0) {
      const fullNameExists = existingUsers.some(user => user.full_name === full_name.value)
      const emailExists = existingUsers.some(user => user.email === email.value)

      if (fullNameExists && emailExists) {
        Swal.fire('⚠️ Duplicate Found', 'Both full name and email already exist.', 'warning')
        isLoading.value = false
        return
      } else if (fullNameExists) {
        Swal.fire('⚠️ Duplicate Name', 'This full name is already taken.', 'warning')
        isLoading.value = false
        return
      } else if (emailExists) {
        Swal.fire('⚠️ Duplicate Email', 'This email is already registered.', 'warning')
        isLoading.value = false
        return
      }
    }

    // Create auth user
    const authResult = await createAuthUser(email.value, generatedPassword.value)
    if (!authResult.success) {
      throw authResult.error
    }

    // Insert into users table
    const { data: userData, error: insertError } = await supabase
      .from('users')
      .insert([
        {
          id: authResult.data.id, // Use the ID from the auth response
          full_name: full_name.value,
          email: email.value,
          role: role.value,
          program: selectedProgramName.value,
          allow_multiple_programs: allowMultiplePrograms.value,
          created_at: new Date().toISOString()
        }
      ])
      .select()

    if (insertError) throw insertError

    // Send welcome email
    const emailResult = await sendWelcomeEmail(email.value, generatedPassword.value, full_name.value)

    if (userData) {
      await Swal.fire({
        icon: 'success',
        title: '✅ Trainer Created Successfully',
        html: `
          <div class="text-left">
            <p>A new trainer account has been created.</p>
            <p class="mt-2"><strong>Login Details:</strong></p>
            <p>Email: ${email.value}</p>
            <p>Password: ${generatedPassword.value}</p>
            ${emailResult.success ? 
              '<p class="text-green-600 mt-2">✓ Welcome email sent successfully</p>' : 
              '<p class="text-yellow-600 mt-2">⚠ Welcome email failed, but account was created</p>'
            }
          </div>
        `,
        confirmButtonText: 'OK'
      })

      emit('added')
      full_name.value = ''
      email.value = ''
      program.value = ''
      generatedPassword.value = ''
      allowMultiplePrograms.value = false
      showModal.value = false
    }

  } catch (error: any) {
    console.error('Error saving trainer:', error)
    
    let errorMessage = 'Failed to create trainer account. Please try again.'
    if (error.message?.includes('already registered')) {
      errorMessage = 'This email is already registered in the system.'
    } else if (error.message?.includes('User not allowed')) {
      errorMessage = 'User creation is not allowed. Please check your Supabase Auth settings.'
    } else if (error.message?.includes('Service role key')) {
      errorMessage = 'Server configuration error. Please contact administrator.'
    }

    Swal.fire('❌ Error', errorMessage, 'error')
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <transition name="fade">
    <div
      v-if="showModal"
      class="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-50"
    >
      <div class="bg-white rounded-lg p-6 w-full max-w-md shadow-lg">
        <h2 class="text-xl font-semibold mb-4 text-gray-800">Add New Trainer</h2>

        <div class="space-y-3">
          <input
            v-model="full_name"
            type="text"
            placeholder="Full Name"
            class="w-full border rounded-md px-3 py-2"
            :disabled="isLoading"
          />

          <input
            v-model="email"
            type="email"
            placeholder="Email"
            class="w-full border rounded-md px-3 py-2"
            :disabled="isLoading"
          />

          <select
            v-model="program"
            class="w-full border rounded-md px-3 py-2"
            :disabled="isLoading"
          >
            <option value="" disabled>Select Program (Optional)</option>
            <option value="">Not Assigned</option>
            <option v-for="p in programs" :key="p.id" :value="p.id">
              {{ p.name }}
            </option>
          </select>

          <div class="flex items-center justify-between">
            <input
              v-model="generatedPassword"
              readonly
              placeholder="Generated Password"
              class="w-3/4 border rounded-md px-3 py-2"
            />
            <button
              @click="generateNewPassword"
              class="bg-gray-700 text-white px-3 py-2 rounded-md hover:bg-gray-800"
              :disabled="isLoading"
            >
              Generate
            </button>
          </div>

          <div class="flex items-center gap-2 p-3 bg-blue-50 rounded-md border border-blue-200">
            <input
              v-model="allowMultiplePrograms"
              type="checkbox"
              id="allowMultiple"
              class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              :disabled="isLoading"
            />
            <label for="allowMultiple" class="text-sm text-gray-700 cursor-pointer">
              Allow this trainer to be assigned to multiple programs
            </label>
          </div>
        </div>

        <div class="mt-5 flex justify-end gap-3">
          <button
            @click="showModal = false"
            class="bg-gray-300 px-4 py-2 rounded-md hover:bg-gray-400 disabled:opacity-50"
            :disabled="isLoading"
          >
            Cancel
          </button>
          <button
            @click="saveTrainer"
            class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            :disabled="isLoading"
          >
            <span v-if="isLoading" class="animate-spin">⏳</span>
            {{ isLoading ? 'Creating...' : 'Save' }}
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>