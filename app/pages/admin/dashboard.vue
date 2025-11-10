<script setup lang="ts">
import HeaderBar from '@/components/HeaderBar.vue';
import SideBar from '@/components/SideBar.vue';
const isSidebarOpen = ref(false)

const toggleSidebar = () => {
  isSidebarOpen.value = !isSidebarOpen.value
}
const closeSidebar = () => {
  isSidebarOpen.value = false
}

    
</script>
<template>
   <div class="bg-red-500">
    <!-- Header -->
    <HeaderBar @toggle-sidebar="toggleSidebar" />
    
    <!-- Sidebar -->        
    <SideBar 
      :is-open="isSidebarOpen" 
      @close="closeSidebar" 
    />
   <span>bro gumana ka na plsss</span> 
   </div> 
</template>
<style scoped>
    
</style>