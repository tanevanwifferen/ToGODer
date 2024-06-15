<script setup>
const globalStore = useGlobalStore();
const chatStore = useChatStore();
</script>
<template>
  <v-toolbar style="grid-row: 1">
    <v-app-bar-nav-icon
      @click="globalStore.sidebarVisible = !globalStore.sidebarVisible"
    ></v-app-bar-nav-icon>
    <v-app-bar-title>{{ chatStore.title }}</v-app-bar-title>
    <v-spacer></v-spacer>
    <v-btn @click="globalStore.donateViewVisible = true"> Donate </v-btn>
  </v-toolbar>
</template>
