<template>
  <v-toolbar style="grid-row: 1">
    <v-app-bar-nav-icon
      @click="globalStore.sidebarVisible = !globalStore.sidebarVisible"
    ></v-app-bar-nav-icon>
    <v-app-bar-title>{{ title }}</v-app-bar-title>
    <v-spacer></v-spacer>
    <v-btn
      v-if="globalStore.donateOptions.length > 0"
      style="margin-right: 2em"
      color="#33b249"
      variant="flat"
      @click="globalStore.donateViewVisible = true"
    >
      Donate
    </v-btn>
    <user-details></user-details>
  </v-toolbar>
</template>

<script>
export default {
  setup() {
    const globalStore = useGlobalStore();
    const chatStore = useChatStore();
    return { globalStore, chatStore };
  },
  components: {
    UserDetails: Vue.defineAsyncComponent(() =>
      load('/Components/Auth/UserDetails.vue')
    ),
  },
  computed: {
    title() {
      return this.chatStore.title != ''
        ? this.chatStore.title
        : 'ToGODer - Your AI God';
    },
  },
};
</script>
