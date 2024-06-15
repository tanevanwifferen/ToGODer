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
      title="New chat"
      @click="chatStore.createNewChat()"
    ></v-list-item>
    <v-list-item @click="chatStore.humanPrompt = !chatStore.humanPrompt">
      <template v-slot:prepend>
        <v-list-item-action start>
          <v-checkbox-btn :model-value="chatStore.humanPrompt"></v-checkbox-btn>
        </v-list-item-action>
      </template>

      <v-list-item-title>Conversational Style</v-list-item-title>
    </v-list-item>
    <v-list-item @click="chatStore.keepGoing = !chatStore.keepGoing">
      <template v-slot:prepend>
        <v-list-item-action start>
          <v-checkbox-btn :model-value="chatStore.keepGoing"></v-checkbox-btn>
        </v-list-item-action>
      </template>

      <v-list-item-title>Keep chat going</v-list-item-title>
    </v-list-item>
    <v-list-item @click="chatStore.lessBloat = !chatStore.lessBloat">
      <template v-slot:prepend>
        <v-list-item-action start>
          <v-checkbox-btn :model-value="chatStore.lessBloat"></v-checkbox-btn>
        </v-list-item-action>
      </template>

      <v-list-item-title>More direct responses</v-list-item-title>
    </v-list-item>
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
          @click.stop="deleteChat(chat.chatId)"
          icon="mdi-trash-can-outline"
        ></v-btn
      ></template>
    </v-list-item>
  </v-navigation-drawer>
</template>

<script>
export default {
  setup() {
    const globalStore = useGlobalStore();
    const chatStore = useChatStore();

    chatStore.$subscribe((mutation, state) => {
      localStorage.setItem('humanPrompt', chatStore.humanPrompt);
      localStorage.setItem('keepGoing', chatStore.keepGoing);
      localStorage.setItem('lessBloat', chatStore.lessBloat);
    });
    return { chatStore, globalStore };
  },
  methods: {
    deleteChat(chatId) {
      // TODO confirm with user
      this.chatStore.deleteChat(chatId);
      this.globalStore.askForDonation();
    },
  },
};
</script>
