<script setup>
const chatStore = useChatStore();
const globalStore = useGlobalStore();
</script>

<template>
  <v-navigation-drawer temporary v-model="globalStore.sidebarVisible">
    <v-list-item title="ToGODer" subtitle="Your digital God"></v-list-item>
    <v-divider></v-divider>
    <v-list-item
      v-for="link in links"
      link
      target="_blank"
      :href="link.url"
      :title="link.name"
    ></v-list-item>
    <v-divider></v-divider>
  </v-navigation-drawer>
</template>

<script>
export default {
  data() {
    return {
      links: [],
    };
  },
  async created() {
    var links = await fetch('/api/links');
    this.links = await links.json();
  },
};
</script>
