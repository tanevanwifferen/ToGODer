<script setup>
const chatStore = useChatStore();
const globalStore = useGlobalStore();
</script>

<template>
  <v-navigation-drawer temporary v-model="globalStore.sidebarVisible">
    <v-list-item
      link
      href="/"
      title="ToGODer"
      subtitle="Your digital God"
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
