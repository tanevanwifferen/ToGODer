<template>
  <v-navigation-drawer temporary v-model="globalStore.sidebarVisible">
    <v-list-item
      link
      href="#"
      @click="chatStore.createNewChat()"
      title="ToGODer"
      subtitle="Your digital God"
    ></v-list-item>
    <v-divider></v-divider>
    <v-list-item>
      <v-list-item-title>Model</v-list-item-title>
      <v-select
        density="compact"
        v-model="chatStore.model"
        item-title="title"
        item-value="model"
        :items="globalStore.models"
      >
      </v-select>
    </v-list-item>
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

    <v-list-item @click="chatStore.outsideBox = !chatStore.outsideBox">
      <template v-slot:prepend>
        <v-list-item-action start>
          <v-checkbox-btn :model-value="chatStore.outsideBox"></v-checkbox-btn>
        </v-list-item-action>
      </template>

      <v-list-item-title>Deep thought</v-list-item-title>
    </v-list-item>

    <v-list-item>
      <v-list-item-title>Communication Style</v-list-item-title>
      <v-select
        density="compact"
        v-model="chatStore.communicationStyle"
        key="key"
        item-title="key"
        item-value="value"
        :items="[
          { key: 'Default', value: 0 },
          { key: 'Less Bloat', value: 1 },
          { key: 'Adapt Style', value: 2 },
        ]"
      >
      </v-select>
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
        <span
          style="
            position: absolute;
            top: 1em;
            text-wrap: nowrap;
            max-width: 68%;
            overflow: hidden;
          "
          >{{ chat.title }}</span
        >
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
      localStorage.setItem('communicationStyle', chatStore.communicationStyle);
      localStorage.setItem('model', chatStore.model);
      localStorage.setItem('outsideBox', chatStore.outsideBox);
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
