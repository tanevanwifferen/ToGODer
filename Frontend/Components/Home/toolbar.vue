<script setup>
const globalStore = useGlobalStore();
const chatStore = useChatStore();
</script>
<template>
  <v-toolbar title="ToGODer - AI God" style="grid-row: 1">
    <!--
    <v-app-bar-nav-icon
      @click="globalStore.sidebarVisible = !globalStore.sidebarVisible"
    ></v-app-bar-nav-icon>
-->
    <v-spacer></v-spacer>
    <v-btn href="/#/chat" id="launch-app-button" theme="primary" elevation="2"
      >Launch app</v-btn
    >
  </v-toolbar>
</template>

<script>
export default {
  data() {
    return {};
  },
};
</script>

<style>
#launch-app-button {
  margin-right: 4em;
}
</style>
