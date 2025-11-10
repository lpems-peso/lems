<script setup lang="ts">
// ==================== IMPORTS ====================
import { FolderArchive, UserPlus, SquarePen, Trash } from 'lucide-vue-next'
import Swal from 'sweetalert2'
import SideBar from '~/components/SideBar.vue'
import HeaderBar from '~/components/HeaderBar.vue'


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

// ==================== FETCH ALL USERS ====================
const fetchUsers = async () => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    users.value = data || []
    console.log('Fetched users:', users.value) // Debug log
  } catch (err) {
    console.error('Error fetching users:', err)
    Swal.fire('Error', 'Failed to fetch users', 'error')
  }
}

// ==================== DELETE USER ====================
const deleteUser = async (id: number) => {
  const confirm = await Swal.fire({
    title: 'Are you sure?',
    text: 'This user will be permanently deleted.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#3085d6',
    cancelButtonColor: '#d33',
    confirmButtonText: 'Yes, delete it!'
  })

  if (!confirm.isConfirmed) return

  try {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id)

    if (error) throw error

    Swal.fire('Deleted!', 'User has been deleted successfully.', 'success')
    await fetchUsers()
  } catch (error) {
    console.error('Error deleting user:', error)
    Swal.fire('Error', 'Failed to delete user', 'error')
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

// ==================== FILTERS + SEARCH ====================
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
     <!-- Header -->
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

  <!-- Overlay (only for mobile when sidebar is open) -->
  <div
    v-if="isSidebarOpen"
    class="fixed inset-0 bg-black bg-opacity-40 z-20 md:hidden"
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

          <!-- ADD USER MODAL -->
          <AddTrainerModal v-model="showAddModal" @added="handleTrainerAdded" />

          <!-- EDIT USER MODAL -->
          <EditUserModal
            :show="showEditModal"
            :user-data="selectedUser"
            @close="closeEditModal"
            @updated="handleUserUpdated"
          />

          <!-- TRAINER TABLE -->
          <div v-if="selectedRole === 'all' || selectedRole === 'trainer'" class="mb-6">
            <h2 class="text-lg font-semibold text-gray-700 mb-2">Trainers</h2>
            <div class="overflow-x-auto border rounded-lg">
              <table class="min-w-full">
                <thead class="bg-green-100 text-gray-700">
                  <tr>
                    <th class="py-2 px-3 text-left">Full Name</th>
                    <th class="py-2 px-3 text-left">Date Created</th>
                    <th class="py-2 px-3 text-left">Email</th>
                    <th class="py-2 px-3 text-left">Role</th>
                    <td class="p-2 text-center font-bold">
                      <div class="flex justify-center items-center space-x-3">
                           Action
                      </div>
                    </td>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="trainer in filteredTrainers"
                    :key="trainer.id"
                    class="border-b hover:bg-gray-50"
                  >
                    <td class="p-2">{{ trainer.full_name }}</td>
                    <td class="p-2">{{ formatDate(trainer.created_at) }}</td>
                    <td class="p-2">{{ trainer.email }}</td>
                    <td class="p-2 font-semibold text-blue-600 capitalize">{{ trainer.role }}</td>
                    <td class="p-2 text-center">
                    <div class="flex justify-center items-center space-x-3">
                        <button
                        @click="openEditModal(trainer)"
                        title="Edit"
                        class="text-blue-600 hover:text-blue-700 hover:scale-125 transition-transform relative group inline-flex items-center justify-center"
                        >
                        <SquarePen :size="18" />
                        <span class="absolute bottom-full mb-2 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                            Edit
                        </span>
                        </button>
                        
                        <button
                        @click="deleteUser(trainer.id)"
                        title="Delete"
                        class="text-red-500 hover:text-red-600 hover:scale-125 transition-transform relative group inline-flex items-center justify-center"
                        >
                        <Trash :size="18" />
                        <span class="absolute bottom-full mb-2 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                            Delete
                        </span>
                        </button>
                    </div>
                    </td>
                  </tr>
                  <tr v-if="filteredTrainers.length === 0">
                    <td colspan="6" class="p-4 text-center text-gray-500">
                      No trainers found
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- TRAINEE TABLE -->
          <div v-if="selectedRole === 'all' || selectedRole === 'trainee'">
            <h2 class="text-lg font-semibold text-gray-700 mb-2">Trainees</h2>
            <div class="overflow-x-auto border rounded-lg">
              <table class="min-w-full">
                <thead class="bg-green-100 text-gray-700">
                  <tr>
                    <th class="py-2 px-3 text-left">Full Name</th>
                    <th class="py-2 px-3 text-left">Date Created</th>
                    <th class="py-2 px-3 text-left">Email</th>
                    <th class="py-2 px-3 text-left">Role</th>
                    <th class="py-2 px-3 text-left">Edit</th>
                    <th class="py-2 px-3 text-left">Delete</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="trainee in filteredTrainees"
                    :key="trainee.id"
                    class="border-b hover:bg-gray-50"
                  >
                    <td class="p-2">{{ trainee.full_name }}</td>
                    <td class="p-2">{{ formatDate(trainee.created_at) }}</td>
                    <td class="p-2">{{ trainee.email }}</td>
                    <td class="p-2 font-semibold text-green-600 capitalize">{{ trainee.role }}</td>
                    <td class="p-2 text-center">
                      <button
                        @click="openEditModal(trainee)"
                        title="Edit"
                        class="text-blue-600 hover:text-blue-700 hover:scale-125 transition-transform relative group inline-flex items-center justify-center"
                      >
                        <SquarePen :size="18" />
                        <span class="absolute bottom-full mb-2 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                          Edit
                        </span>
                      </button>
                    </td>
                    <td class="p-2 text-center">
                      <button
                        @click="deleteUser(trainee.id)"
                        title="Delete"
                        class="text-red-500 hover:text-red-600 hover:scale-125 transition-transform relative group inline-flex items-center justify-center"
                      >
                        <Trash :size="18" />
                        <span class="absolute bottom-full mb-2 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                          Delete
                        </span>
                      </button>
                    </td>
                  </tr>
                  <tr v-if="filteredTrainees.length === 0">
                    <td colspan="6" class="p-4 text-center text-gray-500">
                      No trainees found
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