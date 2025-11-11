<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import Swal from 'sweetalert2'
import { RotateCcw, Trash2 } from 'lucide-vue-next'
import type { Database } from '~/server/database.types'

type User = Database['public']['Tables']['archive_users']['Row']

const archivedUsers = ref<User[]>([])
const isLoading = ref(false)
const errorMessage = ref<string | null>(null)

// Props and Emits
const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits(['close', 'refresh'])

// Supabase client
const supabase = useSupabaseClient()

// ✅ Fetch archived users from archive_users table
const fetchArchivedUsers = async () => {
  try {
    isLoading.value = true
    errorMessage.value = null
    console.log('🔄 Fetching archived users from archive_users table...')
    
    const { data, error, status, statusText } = await supabase
      .from('archive_users')
      .select('*')
      .order('archived_at', { ascending: false })

    console.log('📊 Supabase response:', { 
      data, 
      error, 
      status, 
      statusText,
      dataLength: data?.length 
    })
    
    if (error) {
      console.error('❌ Supabase error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      throw error
    }
    
    archivedUsers.value = data || []
    console.log('✅ Successfully fetched archived users:', archivedUsers.value.length)
    
  } catch (error: any) {
    console.error('❌ Error fetching archived users:', error)
    errorMessage.value = error.message || 'Unknown error occurred'
    
    // More specific error messages based on error type
    let userFriendlyMessage = 'Failed to load archived users'
    
    if (error.code === '42P01') {
      userFriendlyMessage = 'Archive table not found. Please contact administrator.'
    } else if (error.code === '42501') {
      userFriendlyMessage = 'Permission denied. You do not have access to archived users.'
    } else if (error.message?.includes('JWT')) {
      userFriendlyMessage = 'Authentication error. Please refresh the page.'
    }
    
    Swal.fire({
      title: 'Error', 
      text: `${userFriendlyMessage}: ${error.message || 'Unknown error'}`,
      icon: 'error',
      confirmButtonText: 'OK'
    })
  } finally {
    isLoading.value = false
  }
}

// Watch for modal opening
watch(() => props.show, (newValue) => {
  if (newValue) {
    fetchArchivedUsers()
  }
})

onMounted(() => {
  if (props.show) {
    fetchArchivedUsers()
  }
})

const formatDate = (dateString: string) => {
  if (!dateString) return 'N/A'
  
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// ✅ Restore user - move from archive_users back to users
const restoreUser = async (id: string) => {
  const confirm = await Swal.fire({
    title: 'Restore User?',
    text: 'This user will be moved back to the active list.',
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Yes, Restore',
    cancelButtonText: 'Cancel',
  })

  if (confirm.isConfirmed) {
    try {
      // First, get the user data from archive_users
      const { data: archivedUser, error: fetchError } = await supabase
        .from('archive_users')
        .select('*')
        .eq('id', id)
        .single()

      if (fetchError) throw fetchError

      if (!archivedUser) {
        throw new Error('User not found in archive')
      }

      // Remove archive-specific fields
      const { archived_at, ...userData } = archivedUser

      // Insert the user back into the users table with active status and current timestamp
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          ...userData,
          status: 'active',
          updated_at: new Date().toISOString()
        })

      if (insertError) throw insertError

      // Delete the user from archive_users
      const { error: deleteError } = await supabase
        .from('archive_users')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError

      Swal.fire({
        title: 'Restored!', 
        text: 'User has been restored successfully', 
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      })
      
      archivedUsers.value = archivedUsers.value.filter(u => u.id !== id)
      emit('refresh') // Notify parent to refresh active users list
    } catch (error: any) {
      console.error('Restore error:', error)
      Swal.fire({
        title: 'Error',
        text: `Failed to restore user: ${error.message || 'Unknown error'}`,
        icon: 'error'
      })
    }
  }
}

// ✅ Permanently delete user from archive_users table
const deleteUser = async (id: string) => {
  const confirm = await Swal.fire({
    title: 'Delete Permanently?',
    text: 'This action cannot be undone!',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#e3342f',
    confirmButtonText: 'Yes, Delete',
    cancelButtonText: 'Cancel',
  })

  if (confirm.isConfirmed) {
    try {
      const { error } = await supabase
        .from('archive_users')
        .delete()
        .eq('id', id)

      if (error) throw error

      Swal.fire({
        title: 'Deleted!', 
        text: 'User has been permanently deleted', 
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      })
      
      archivedUsers.value = archivedUsers.value.filter(u => u.id !== id)
    } catch (error: any) {
      console.error('Delete error:', error)
      Swal.fire({
        title: 'Error',
        text: `Failed to delete user: ${error.message || 'Unknown error'}`,
        icon: 'error'
      })
    }
  }
}

// Retry function
const retryFetch = () => {
  fetchArchivedUsers()
}
</script>

<template>
  <div
    v-if="show"
    class="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-50"
    @click.self="$emit('close')"
  >
    <div class="bg-white w-[1050px] max-h-[80vh] overflow-y-auto rounded-2xl shadow-lg p-6 relative">
      <button
        @click="$emit('close')"
        class="absolute top-3 right-3 text-gray-500 hover:text-black text-xl transition-colors"
      >
        ✖
      </button>

      <h2 class="text-xl font-bold mb-4 flex items-center gap-2">📁 Archived Users</h2>

      <!-- Loading State -->
      <div v-if="isLoading" class="text-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
        <p class="text-gray-500 mt-2">Loading archived users...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="errorMessage" class="text-center py-8">
        <div class="text-4xl mb-2">❌</div>
        <p class="text-red-600 font-medium">Failed to load archived users</p>
        <p class="text-gray-500 text-sm mt-1 mb-4">{{ errorMessage }}</p>
        <button
          @click="retryFetch"
          class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition-colors"
        >
          Try Again
        </button>
      </div>

      <!-- Users Table -->
      <div v-else-if="archivedUsers && archivedUsers.length > 0">
        <table class="min-w-full border text-sm">
          <thead class="bg-gray-100">
            <tr>
              <th class="border p-2">Full Name</th>
              <th class="border p-2">Email</th>
              <th class="border p-2">Role</th>
              <th class="border p-2">Program</th>
              <th class="border p-2">Date Created</th>
              <th class="border p-2">Date Archived</th>
              <th class="border p-2">Status</th>
              <th class="border p-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in archivedUsers" :key="user.id" class="hover:bg-gray-50">
              <td class="border p-2">{{ user.full_name }}</td>
              <td class="border p-2">{{ user.email }}</td>
              <td class="border p-2 capitalize">{{ user.role }}</td>
              <td class="border p-2">{{ user.program || 'N/A' }}</td>
              <td class="border p-2">
                {{ formatDate(user.created_at) }}
              </td>
              <td class="border p-2">
                {{ formatDate(user.archived_at) }}
              </td>
              <td class="border p-2 capitalize">
                <span class="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">
                  {{ user.status || 'archived' }}
                </span>
              </td>
              <td class="border p-2 text-center">
                <div class="flex justify-center items-center gap-2">
                  <!-- Restore Button -->
                  <button
                    @click="restoreUser(user.id)"
                    class="bg-green-500 hover:bg-green-600 text-white w-9 h-9 rounded flex items-center justify-center transition-all relative group"
                    title="Restore"
                    :disabled="isLoading"
                  >
                    <RotateCcw :size="18" />
                    <span class="absolute bottom-full mb-2 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                      Restore
                    </span>
                  </button>
                  
                  <!-- Delete Button -->
                  <button
                    @click="deleteUser(user.id)"
                    class="bg-red-500 hover:bg-red-600 text-white w-9 h-9 rounded flex items-center justify-center transition-all relative group"
                    title="Delete Permanently"
                    :disabled="isLoading"
                  >
                    <Trash2 :size="18" />
                    <span class="absolute bottom-full mb-2 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                      Delete
                    </span>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Empty State -->
      <div v-else class="text-center text-gray-500 mt-6 py-8">
        <div class="text-4xl mb-2">📭</div>
        <p>No archived users found.</p>
        <p class="text-sm mt-1">Users you archive will appear here.</p>
      </div>
    </div>
  </div>
</template>