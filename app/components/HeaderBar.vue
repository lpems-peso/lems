<script setup>
// Composables
const { $supabase } = useNuxtApp()
const router = useRouter()

// State
const dropdownOpen = ref(false)
const dropdownContainer = ref(null)

// Emits
const emit = defineEmits(['toggle-sidebar'])

// Methods
function toggleDropdown() {
  dropdownOpen.value = !dropdownOpen.value
}

// Close dropdown when clicking outside using VueUse
onClickOutside(dropdownContainer, () => {
  dropdownOpen.value = false
})

async function logout() {
  try {
    console.log('Attempting logout...')
    
    // Try multiple methods to ensure logout
    const methods = [
      $supabase.auth.signOut(),
      $supabase.auth.setSession(null),
      $supabase.auth.refreshSession()
    ]
    
    // Execute all methods, ignore individual errors
    await Promise.allSettled(methods)
    
    // Clear all local data
    localStorage.clear()
    sessionStorage.clear()
    
    console.log('Logout completed, redirecting...')
    
    // Force redirect
    window.location.href = '/login'
    
  } catch (error) {
    console.error('Logout error, forcing redirect:', error)
    // Force redirect even on error
    window.location.href = '/login'
  }
}
</script>

<template>
  <header
    class="w-full bg-[#1b2b39] text-white h-16 px-4 flex items-center justify-between shadow-md relative"
  >
    <!-- 🔹 Left side: Burger + Logo + Title -->
    <div class="flex items-center space-x-3">
      <!-- 🍔 Burger Icon -->
      <button
        class="lg:hidden text-white focus:outline-none"
        @click="emit('toggle-sidebar')"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="w-7 h-7"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <!-- 🧩 Logo -->
      <img
        src="/image/logo2.jpg"
        alt="System Logo"
        class="w-10 h-10 rounded-full object-cover"
      />

      <!-- 🏷️ Title (Full on desktop, "LEMS" on mobile) -->
      <h1
        class="text-base md:text-lg font-semibold truncate whitespace-nowrap overflow-hidden max-w-[500px] sm:max-w-[600px] md:max-w-[700px]"
        title="Livelihood Enrollment & Monitoring System"
      >
        <span class="hidden sm:inline">Livelihood Enrollment & Monitoring System</span>
        <span class="inline sm:hidden">LEMS</span>
      </h1>
    </div>

    <!-- 🔹 Right side:Notification + Profile -->
    <div class="flex items-center space-x-4 text-sm relative">
      
      <!-- 🔔 Notification -->
      <button
        class="text-xl hover:text-gray-300 transition"
        title="Notifications"
      >
        🔔
      </button>

      <!-- 👤 Profile Dropdown -->
      <div ref="dropdownContainer" class="relative">
        <button
          @click="toggleDropdown"
          class="flex items-center bg-gray-700 text-sm rounded-md px-3 py-1 hover:bg-gray-600 cursor-pointer transition focus:outline-none"
        >
          <span>Profile ▼</span>
        </button>

        <!-- Dropdown menu -->
        <transition name="fade">
          <div
            v-if="dropdownOpen"
            class="absolute right-0 mt-2 w-40 bg-white text-gray-800 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50"
          >
            <NuxtLink
              to="/profile"
              class="block px-4 py-2 text-sm hover:bg-gray-100"
              @click="dropdownOpen = false"
            >
              View Profile
            </NuxtLink>
            <button
              @click="logout"
              class="w-full text-left block px-4 py-2 text-sm hover:bg-gray-100"
            >
              Logout
            </button>
          </div>
        </transition>
      </div>
    </div>
  </header>
</template>

<style scoped>
/* Smooth fade for floating search */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}

header {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
</style>