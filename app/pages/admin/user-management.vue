<script setup lang="ts">
// ==================== IMPORTS ====================
import { FolderArchive, UserPlus, SquarePen, Trash } from 'lucide-vue-next'
import Swal from 'sweetalert2'
import type { Database } from '~/server/database.types'

// ==================== TYPES ====================
type User = Database['public']['Tables']['users']['Row']
type ArchivedUser = Database['public']['Tables']['archive_users']['Row']

// ==================== STATE ====================
const users = ref<User[]>([])
const isSidebarOpen = ref(false)
const selectedRole = ref<'all' | 'trainer' | 'trainee'>('all')
const showAddModal = ref(false)
const showArchiveModal = ref(false)
const archivedUsers = ref<ArchivedUser[]>([])
const searchQuery = ref('')
const showEditModal = ref(false)
const selectedUser = ref<User | null>(null)

// ==================== SUPABASE CLIENT ====================
const supabase = useSupabaseClient()

const toggleSidebar = () => {
  isSidebarOpen.value = !isSidebarOpen.value
}

// ==================== FETCH ACTIVE USERS ====================
const fetchUsers = async () => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    users.value = data || []
    console.log('Fetched users:', users.value)
  } catch (err) {
    console.error('Error fetching users:', err)
    Swal.fire('Error', 'Failed to fetch users', 'error')
  }
}

// ==================== FETCH ARCHIVED USERS ====================


// ==================== MODAL CONTROLS ====================
const openArchiveModal = async () => {
  showArchiveModal.value = true

}

const closeArchiveModal = () => {
  showArchiveModal.value = false
}

// ==================== ARCHIVE USER ====================
const archiveUser = async (user: User) => {
  const confirm = await Swal.fire({
    title: 'Are you sure?',
    text: 'This user will be archived.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#3085d6',
    cancelButtonColor: '#d33',
    confirmButtonText: 'Yes, archive it!'
  })

  if (!confirm.isConfirmed) return

  try {
    // First, insert the user into archive_users table
    const { data: archiveData, error: archiveError } = await supabase
      .from('archive_users')
      .insert({
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        program: user.program,
        other_program: user.other_program,
        created_at: user.created_at,
        archived_at: new Date().toISOString()
      })
      .select()

    if (archiveError) {
      console.error('Archive error:', archiveError)
      throw archiveError
    }

    // Then, delete the user from the main users table
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', user.id)

    if (deleteError) {
      console.error('Delete error:', deleteError)
      throw deleteError
    }

    Swal.fire('Archived!', 'User has been archived successfully.', 'success')
    await fetchUsers() // Refresh the active users list
  } catch (error) {
    console.error('Error archiving user:', error)
    Swal.fire('Error', `Failed to archive user: ${error.message || 'Unknown error'}`, 'error')
  }
}

// ==================== DELETE USER (PERMANENT) ====================
const deleteUser = async (id: string) => {
  const confirm = await Swal.fire({
    title: 'Are you sure?',
    text: 'This user will be permanently deleted.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#3085d6',
    confirmButtonText: 'Yes, delete permanently!'
  })

  if (!confirm.isConfirmed) return

  try {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id)

    if (error) throw error

    Swal.fire('Deleted!', 'User has been permanently deleted.', 'success')
    await fetchUsers()
  } catch (error) {
    console.error('Error deleting user:', error)
    Swal.fire('Error', 'Failed to delete user', 'error')
  }
}

// ==================== RESTORE USER FROM ARCHIVE ====================
const restoreUser = async (user: ArchivedUser) => {
  const confirm = await Swal.fire({
    title: 'Restore User?',
    text: 'This user will be restored to active users.',
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#3085d6',
    cancelButtonColor: '#d33',
    confirmButtonText: 'Yes, restore!'
  })

  if (!confirm.isConfirmed) return

  try {
    // Insert back to users table
    const { error: restoreError } = await supabase
      .from('users')
      .insert([
        {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
          program: user.program,
          other_program: user.other_program,
          created_at: user.created_at,
          updated_at: new Date().toISOString()
        }
      ])

    if (restoreError) throw restoreError

    // Remove from archive
    const { error: deleteError } = await supabase
      .from('archive_users')
      .delete()
      .eq('id', user.id)

    if (deleteError) throw deleteError

    Swal.fire('Restored!', 'User has been restored successfully.', 'success')
    await fetchArchivedUsers() // Refresh archived users list
    await fetchUsers() // Refresh active users list
  } catch (error) {
    console.error('Error restoring user:', error)
    Swal.fire('Error', 'Failed to restore user', 'error')
  }
}

// ==================== EDIT USER MODAL ====================
const openEditModal = (user: User) => {
  selectedUser.value = { ...user }
  showEditModal.value = true
}

const closeEditModal = () => {
  showEditModal.value = false
  selectedUser.value = null
}

const handleUserUpdated = () => {
  fetchUsers()
}

// ==================== LIFECYCLE ====================
onMounted(() => {
  fetchUsers()
})

// Refresh list when modal closes
watch(showAddModal, (newVal, oldVal) => {
  if (oldVal === true && newVal === false) {
    fetchUsers()
  }
})

// ==================== EVENT HANDLER ====================
const handleTrainerAdded = () => {
  fetchUsers()
}

// ==================== FORMAT DATE ====================
const formatDate = (date: string | null) => {
  if (!date) return 'No date'
  const parsed = new Date(date)
  if (isNaN(parsed.getTime())) return 'Invalid date'
  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

// ==================== COMBINED FILTER + SEARCH ====================
const filteredUsers = computed(() => {
  return users.value.filter(user => {
    // Exclude admin users from display
    if (user.role === 'admin') return false
    
    // Role filter
    const roleMatches = selectedRole.value === 'all' || user.role === selectedRole.value
    
    // Search filter
    const searchMatches = 
      user.full_name?.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      user.program?.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      user.other_program?.toLowerCase().includes(searchQuery.value.toLowerCase())
    
    return roleMatches && searchMatches
  })
})

// ==================== UTILITY FUNCTIONS ====================
const getRoleBadgeClass = (role: string) => {
  switch (role) {
    case 'trainer': return 'text-blue-600'
    case 'trainee': return 'text-green-600'
    default: return 'text-gray-600'
  }
}

const getUserInitials = (fullName: string | null) => {
  if (!fullName) return 'U'
  return fullName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}
</script>

<template>
  <div class="flex flex-col min-h-screen bg-gray-100">
    <!-- HEADER -->
    <HeaderBar @toggle-sidebar="toggleSidebar" />

    <div class="flex flex-1">
      <!-- Sidebar - Always visible on desktop, hidden by default on mobile -->
      <SideBar
        :class="[
          'bg-[#0f172a] z-30 transition-transform duration-300 ease-in-out',
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full',
          'md:translate-x-0 md:static md:block md:w-64'
        ]"
      />

      <!-- MOBILE SIDEBAR OVERLAY -->
      <div
        v-if="isSidebarOpen"
        class="fixed inset-0 bg-black bg-opacity-40 z-40 md:hidden"
        @click="isSidebarOpen = false"
      />

      <!-- MAIN CONTENT -->
      <div class="flex-1 p-4 sm:p-6 flex flex-col items-center justify-start w-full">
        <div class="w-full max-w-6xl bg-white rounded-lg shadow p-6">
          
          <!-- FILTERS + SEARCH -->
          <div class="flex flex-wrap justify-between items-center mb-6">
            <div class="flex gap-3 flex-wrap items-center">
              <!-- ROLE FILTER -->
              <select
                v-model="selectedRole"
                class="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-colors"
              >
                <option value="all">All Users</option>
                <option value="trainer">Trainers</option>
                <option value="trainee">Trainees</option>
              </select>

              <!-- 🔍 SEARCH BAR -->
              <div class="relative">
                <input
                  v-model="searchQuery"
                  type="text"
                  placeholder="🔍 Search by name or email..."
                  class="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-colors w-56"
                >
              </div>
            </div>

            <!-- ACTION BUTTONS -->
            <div class="flex gap-3 mt-3 sm:mt-0">
              <!-- Archive Button -->
              <button
                @click="openArchiveModal"
                title="Archive Users"
                class="bg-yellow-400 hover:bg-yellow-500 text-white px-4 py-2 rounded-md transition-all flex items-center justify-center hover:scale-105 relative group"
              >
                <FolderArchive :size="20" />
                <!-- Tooltip -->
                <span class="absolute bottom-full mb-2 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                  View Archive
                </span>
              </button>

              <!-- Add New User Button -->
              <button
                @click="showAddModal = true"
                title="Add New User"
                class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-all flex items-center justify-center hover:scale-105 relative group"
              >
                <UserPlus :size="20" />
                <!-- Tooltip -->
                <span class="absolute bottom-full mb-2 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                  Add New User
                </span>
              </button>
            </div>
          </div>

          <!-- ARCHIVE MODAL -->
          <ArchiveModal
            :show="showArchiveModal"
            :archived-users="archivedUsers"
            @close="closeArchiveModal"
            @restore="restoreUser"
            @refresh="fetchUsers"
          />

          <!-- ADD USER MODAL -->
          <AddTrainerModal v-model="showAddModal" @added="handleTrainerAdded" />

          <!-- EDIT USER MODAL -->
          <EditUserModal
            :show="showEditModal"
            :user-data="selectedUser"
            @close="closeEditModal"
            @updated="handleUserUpdated"
          />

          <!-- COMBINED USER TABLE -->
          <div class="mb-6">
            <h2 class="text-lg font-semibold text-gray-700 mb-2">
              {{ 
                selectedRole === 'all' ? 'All Users' : 
                selectedRole === 'trainer' ? 'Trainers' : 'Trainees'
              }}
              <span class="text-sm text-gray-500 ml-2">({{ filteredUsers.length }})</span>
            </h2>
            <div class="overflow-x-auto border border-gray-200 rounded-lg">
              <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-green-50 text-gray-700">
                  <tr>
                    <th class="py-3 px-4 text-left text-sm font-semibold">Full Name</th>
                    <th class="py-3 px-4 text-left text-sm font-semibold">Date Created</th>
                    <th class="py-3 px-4 text-left text-sm font-semibold">Email</th>
                    <th class="py-3 px-4 text-left text-sm font-semibold">Role</th>
                    <th class="py-3 px-4 text-left text-sm font-semibold">Program</th>
                    <th class="py-3 px-4 text-left text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-200">
                  <tr
                    v-for="user in filteredUsers"
                    :key="user.id"
                    class="hover:bg-gray-50 transition-colors"
                  >
                    <td class="py-3 px-4">
                      <div class="flex items-center gap-3">
                        <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span class="text-blue-600 text-xs font-medium">
                            {{ getUserInitials(user.full_name) }}
                          </span>
                        </div>
                        <span class="font-medium text-gray-900">{{ user.full_name || 'No Name' }}</span>
                      </div>
                    </td>
                    <td class="py-3 px-4 text-sm text-gray-600">{{ formatDate(user.created_at) }}</td>
                    <td class="py-3 px-4 text-sm text-gray-600">{{ user.email }}</td>
                    <td class="py-3 px-4">
                      <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize" 
                            :class="getRoleBadgeClass(user.role)">
                        {{ user.role }}
                      </span>
                    </td>
                    <td class="py-3 px-4 text-sm text-gray-600">
                      <div>
                        <div>{{ user.program }}</div>
                        <div v-if="user.other_program" class="text-xs text-gray-400">{{ user.other_program }}</div>
                      </div>
                    </td>
                    <td class="py-3 px-4">
                      <div class="flex items-center gap-2">
                        <button
                          @click="openEditModal(user)"
                          title="Edit"
                          class="text-blue-600 hover:text-blue-700 hover:scale-110 transition-transform relative group p-1 rounded hover:bg-blue-50"
                        >
                          <SquarePen :size="18" />
                          <span class="absolute bottom-full mb-2 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                            Edit
                          </span>
                        </button>
                      
                        <button
                          @click="archiveUser(user)"
                          title="Archive"
                          class="text-yellow-500 hover:text-yellow-600 hover:scale-110 transition-transform relative group p-1 rounded hover:bg-yellow-50"
                        >
                          <FolderArchive :size="18" />
                          <span class="absolute bottom-full mb-2 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                            Archive
                          </span>
                        </button>
                      </div>
                    </td>
                  </tr>
                  <tr v-if="filteredUsers.length === 0">
                    <td colspan="6" class="p-8 text-center text-gray-500">
                      <div class="flex flex-col items-center justify-center">
                        <FolderArchive :size="48" class="text-gray-300 mb-2" />
                        <p class="text-lg font-medium text-gray-400">
                          No {{ 
                            selectedRole === 'all' ? 'users' : 
                            selectedRole === 'trainer' ? 'trainers' : 'trainees'
                          }} found
                        </p>
                        <p class="text-sm text-gray-400 mt-1">
                          {{ searchQuery ? 'Try adjusting your search' : 'No users match your criteria' }}
                        </p>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
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