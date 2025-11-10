<script setup lang="ts">
const route = useRoute()

const isActive = (path: string) => route.path === path

// Check if current route is related to Program Management
const showProgramSubmenu = computed(() =>
  route.path === '/admin/program-management' || route.path.startsWith('/admin/archived-programs')
)
</script>

<template>
  <aside class="hidden lg:flex w-64 bg-[#1b2b39] text-white flex-col min-h-screen">
    <nav class="flex-1 p-4 space-y-2">

    
      <!-- User Management -->
      <NuxtLink
        to="/admin/user-management"
        :class="[
          'block rounded-md py-2 px-3 transition-colors duration-200',
          isActive('/admin/user-management') ? 'bg-teal-500 text-white' : 'hover:bg-gray-700 text-gray-200'
        ]"
      >
        User Management
      </NuxtLink>

      <!-- Enrollment Management -->
      <NuxtLink
        to="#"
        class="block hover:bg-gray-700 rounded-md py-2 px-3 text-gray-200 transition-colors duration-200"
      >
        Enrollment Management
      </NuxtLink>

      <!-- Reports -->
      <NuxtLink
        to="#"
        class="block hover:bg-gray-700 rounded-md py-2 px-3 text-gray-200 transition-colors duration-200"
      >
        Reports & Monitoring
      </NuxtLink>

      <!-- Program Management -->
      <div>
        <!-- Main link -->
        <NuxtLink
          to="/admin/program-management"
          :class="[
            'block rounded-md py-2 px-3 transition-colors duration-200',
            (isActive('/admin/program-management') || route.path.startsWith('/admin/archived-programs'))
              ? 'bg-teal-500 text-white'
              : 'hover:bg-gray-700 text-gray-200'
          ]"
        >
          Program Management
        </NuxtLink>

        <!-- Submenu: Only visible when in Program/Archived -->
        <Transition
          enter-active-class="transition-all duration-200 ease-out"
          enter-from-class="opacity-0 transform -translate-y-2"
          enter-to-class="opacity-100 transform translate-y-0"
          leave-active-class="transition-all duration-200 ease-in"
          leave-from-class="opacity-100 transform translate-y-0"
          leave-to-class="opacity-0 transform -translate-y-2"
        >
          <div v-if="showProgramSubmenu" class="ml-5 mt-1">
            <NuxtLink
              to="/admin/archived-programs"
              :class="[
                'block rounded-md py-2 px-3 text-sm transition-colors duration-200',
                isActive('/admin/archived-programs')
                  ? 'bg-teal-600 text-white'
                  : 'hover:bg-gray-700 text-gray-300'
              ]"
            >
              📦 Archived Programs
            </NuxtLink>
          </div>
        </Transition>
      </div>

      <!-- System Management -->
      <NuxtLink
        to="#"
        class="block hover:bg-gray-700 rounded-md py-2 px-3 text-gray-200 transition-colors duration-200"
      >
        System Management
      </NuxtLink>

    </nav>
  </aside>
</template>