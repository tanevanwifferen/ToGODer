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
    <v-list-item
      link
      @click="
        chatStore.createNewChat();
        globalStore.sidebarVisible = false;
      "
      title="New chat"
    ></v-list-item>
    <v-divider></v-divider>
    <v-list-item
      link
      @click="chatStore.chatId = chat.chatId"
      v-for="chat in chatStore.chatsOrderedByDateDescending.filter(
        (x) => x.title != null && x.title != ''
      )"
    >
      <template v-slot="content">
        <span style="position: absolute; top: 1em">{{ chat.title }}</span>
        <!--
        <router-link :to="`/chat?chatId=${chat.chatId}`" style="width: 100%">{{
          chat.title
        }}</router-link>
        -->
        <v-btn
          style="float: right"
          variant="text"
          @click.stop="chatStore.deleteChat(chat.chatId)"
          icon="mdi-trash-can-outline"
        ></v-btn
      ></template>
    </v-list-item>
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
