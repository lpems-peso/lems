<script setup lang="ts">
// ==================== IMPORTS ====================
import { FolderArchive, UserPlus, SquarePen, Trash } from 'lucide-vue-next'
import Swal from 'sweetalert2'

// ==================== STATE ====================
const users = ref<any[]>([])
const isSidebarOpen = ref(false)
const selectedRole = ref('all')
const showAddModal = ref(false)
const showArchiveModal = ref(false)
const archivedUsers = ref<any[]>([])
const searchQuery = ref('')
const showEditModal = ref(false)
const selectedUser = ref<any>(null)

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
const fetchArchivedUsers = async () => {
  try {
    const { data, error } = await supabase
      .from('archive_users') // Changed to archive_users table
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    archivedUsers.value = data || []
  } catch (err) {
    console.error('Error fetching archived users:', err)
    Swal.fire('Error', 'Failed to fetch archived users', 'error')
  }
}

// ==================== MODAL CONTROLS ====================
const openArchiveModal = async () => {
  showArchiveModal.value = true
  await fetchArchivedUsers()
}

const closeArchiveModal = () => {
  showArchiveModal.value = false
}

// ==================== ARCHIVE USER ====================
const archiveUser = async (user: any) => {
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
    const { error: archiveError } = await supabase
      .from('archive_users')
      .insert([
        {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
          created_at: user.created_at,
          archived_at: new Date().toISOString() // Add archive timestamp
        }
      ])

    if (archiveError) throw archiveError

    // Then, delete the user from the main users table
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', user.id)

    if (deleteError) throw deleteError

    Swal.fire('Archived!', 'User has been archived successfully.', 'success')
    await fetchUsers() // Refresh the active users list
  } catch (error) {
    console.error('Error archiving user:', error)
    Swal.fire('Error', 'Failed to archive user', 'error')
  }
}

// ==================== DELETE USER (PERMANENT) ====================
const deleteUser = async (id: number) => {
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
// You can add this function to your ArchiveUserModal component
const restoreUser = async (user: any) => {
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
          created_at: user.created_at
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
  } catch (error) {
    console.error('Error restoring user:', error)
    Swal.fire('Error', 'Failed to restore user', 'error')
  }
}

// ==================== EDIT USER MODAL ====================
const openEditModal = (user: any) => {
  selectedUser.value = { ...user }
  showEditModal.value = true
}

const closeEditModal = () => {
  showEditModal.value = false
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
      user.email?.toLowerCase().includes(searchQuery.value.toLowerCase())
    
    return roleMatches && searchMatches
  })
})

// Optional: Keep these if you need them elsewhere, otherwise you can remove them
const filteredTrainers = computed(() =>
  users.value.filter(u =>
    u.role === 'trainer' &&
    (u.full_name?.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
     u.email?.toLowerCase().includes(searchQuery.value.toLowerCase()))
  )
)

const filteredTrainees = computed(() =>
  users.value.filter(u =>
    u.role === 'trainee' &&
    (u.full_name?.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
     u.email?.toLowerCase().includes(searchQuery.value.toLowerCase()))
  )
)
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


      <!-- MOBILE SIDEBAR -->
      <transition name="fade">
        <Sidebar
          v-if="isSidebarOpen"
          class="fixed inset-y-0 left-0 w-64 bg-[#0f172a] z-50 md:hidden"
        />
      </transition>

      <!-- OVERLAY -->
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
                class="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-green-500"
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
                  class="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-green-500 w-56"
                >
              </div>
            </div>

            <!-- ACTION BUTTONS -->
            <div class="flex gap-3 mt-3 sm:mt-0">
              <!-- Archive Button -->
              <button
                @click="openArchiveModal"
                title="Archive Users"
                class="bg-yellow-400 hover:bg-yellow-500 text-white px-4 py-2 rounded-md transition-all flex items-center justify-center hover:scale-110 relative group"
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
                class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-all flex items-center justify-center hover:scale-110 relative group"
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
          <ArchiveUserModal
            :show="showArchiveModal"
            :archived-users="archivedUsers"
            @close="closeArchiveModal"
            @restore="restoreUser"
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
            </h2>
            <div class="overflow-x-auto border rounded-lg">
              <table class="min-w-full">
                <thead class="bg-green-100 text-gray-700">
                  <tr>
                    <th class="py-2 px-3 text-left">Full Name</th>
                    <th class="py-2 px-3 text-left">Date Created</th>
                    <th class="py-2 px-3 text-left">Email</th>
                    <th class="py-2 px-3 text-left">Role</th>
                    <th class="py-2 px-3 text-left">Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="user in filteredUsers"
                    :key="user.id"
                    class="border-b hover:bg-gray-50"
                  >
                    <td class="py-2 px-3">{{ user.full_name }}</td>
                    <td class="py-2 px-3">{{ formatDate(user.created_at) }}</td>
                    <td class="py-2 px-3">{{ user.email }}</td>
                    <td class="py-2 px-3 font-semibold capitalize" 
                        :class="user.role === 'trainer' ? 'text-blue-600' : 'text-green-600'">
                      {{ user.role }}
                    </td>
                    <td class="py-2 px-3">
                      <div class="flex items-center space-x-3">
                        <button
                          @click="openEditModal(user)"
                          title="Edit"
                          class="text-blue-600 hover:text-blue-700 hover:scale-125 transition-transform relative group inline-flex items-center justify-center"
                        >
                          <SquarePen :size="18" />
                          <span class="absolute bottom-full mb-2 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                            Edit
                          </span>
                        </button>
                      
                        <button
                          @click="archiveUser(user)"
                          title="Archive"
                          class="text-yellow-500 hover:text-yellow-600 hover:scale-125 transition-transform relative group inline-flex items-center justify-center"
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
                    <td colspan="5" class="p-4 text-center text-gray-500">
                      No {{ 
                        selectedRole === 'all' ? 'users' : 
                        selectedRole === 'trainer' ? 'trainers' : 'trainees'
                      }} found
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