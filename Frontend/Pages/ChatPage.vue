<template>
  <div>
    <v-toolbar style="grid-row: 1">
      <v-app-bar-nav-icon @click="sidebar = !sidebar"></v-app-bar-nav-icon>
      <v-app-bar-title>{{ title }}</v-app-bar-title>
    </v-toolbar>
    <v-navigation-drawer temporary v-model="sidebar">
      <v-list-item title="ToGODer" subtitle="Your digital God"></v-list-item>
      <v-divider></v-divider>
      <v-list-item
        link
        @click="
          createNewChat();
          sidebar = false;
        "
        title="New chat"
      ></v-list-item>
      <v-divider></v-divider>
      <v-list-item
        link
        @click="
          chatId = chat.chatId;
          sidebar = false;
        "
        v-for="chat in chatsOrderedByDateDescending.filter(
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
    <chat
      style="grid-row: 2"
      :message-list-prop="messages"
      :prompts-list-prop="prompts"
      @on-message-was-sent="sendMessage"
    >
    </chat>
  </div>
</template>

<script>
class Chat {
  constructor(chatId) {
    this.chatId = chatId;
    this.messages = [];
    this.title = "";
    this.created = new Date().getTime();
  }
}

export default {
  components: {
    chat: Vue.defineAsyncComponent(() =>
      loadModule("/Components/chat.vue", options)
    ),
  },

  data() {
    return {
      computedIndex: 0,
      chatId: null,
      chats: {},
      prompts: [],
      sidebar: false,
    };
  },
  async beforeCreate() {
    var prompts = await fetch("/api/prompts");
    this.prompts = await prompts.json();
    this.chats = JSON.parse(localStorage.getItem("chats") || "{}");
    for (let key of Object.keys(this.chats)) {
      if (this.chats[key].messages.length == 0) {
        delete this.chats[key];
        this.saveHistory();
      }
    }
    this.createNewChat();
  },
  computed: {
    chat() {
      if (this.chatId == null) {
        return new Chat(uuidv4());
      }
      return this.chats[this.chatId];
    },
    messages() {
      return this.chat.messages || [];
    },
    title() {
      return this.chat.title || "ToGODer";
    },
    chatsOrderedByDateDescending() {
      this.computedIndex;
      var items = Object.values(this.chats);
      items.sort((a, b) => b.created - a.created);
      return items;
    },
  },
  methods: {
    deleteChat(chatId) {
      delete chats[chatId];
      saveHistory();
      computedIndex++;
    },
    createNewChat() {
      var chatId = uuidv4();
      var toAdd = new Chat(chatId);
      this.chats[chatId] = toAdd;
      this.chatId = chatId;
    },
    async sendMessage(message) {
      if (message.body.toLowerCase() == "debug") {
        this.debug = !this.debug;
        return;
      }
      this.chat.messages.push({
        ...message,
        date: new Date().getTime(),
      });
      var response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          this.messages.map((x) => ({
            content: x.body,
            role: x.author == "you" ? "user" : "assistant",
          }))
        ),
      });
      if (!response.ok) {
        throw new Error("Error sending message");
      }

      var title = await this.getTitle();
      if (title != null) {
        this.chat.title = title;
      }
      // Handle successful response
      this.chat.messages.push({
        body: marked.parse(await response.text()),
        author: "assistant",
        date: new Date().getTime(),
      });

      this.saveHistory();
    },
    async getTitle() {
      if (this.messages.length > 1) {
        return null;
      }
      var response = await fetch("/api/title", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          this.messages.map((x) => ({
            content: x.body,
            role: x.author == "you" ? "user" : "assistant",
          }))
        ),
      });
      if (!response.ok) {
        throw new Error("Error getting title");
      }
      return await response.text();
    },
    async saveHistory() {
      localStorage.setItem("chats", JSON.stringify(this.chats));
      if (Object.keys(this.chats).length == 0) {
        this.createNewChat();
      }
    },
  },
};
</script>
