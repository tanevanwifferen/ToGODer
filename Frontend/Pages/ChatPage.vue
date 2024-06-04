<template>
  <div style="height: 100%; display: grid; grid-template-rows: 64px auto">
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
    this.title = '';
    this.created = new Date().getTime();
  }
}

export default {
  components: {
    chat: Vue.defineAsyncComponent(() =>
      loadModule('/Components/chat.vue', options)
    ),
  },

  data() {
    return {
      computedIndex: 0,
      chatId: null,
      chats: {},
      prompts: [],
      sidebar: false,
      rateLimitExceeded: false,
    };
  },
  async beforeCreate() {
    var prompts = await fetch('/api/prompts');
    this.prompts = await prompts.json();
    this.chats = JSON.parse(localStorage.getItem('chats') || '{}');
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
      return this.chat.title || 'ToGODer';
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
      try {
        if (message.body.toLowerCase() == 'debug') {
          this.debug = !this.debug;
          return;
        }
        this.chat.messages.push({
          ...message,
          date: new Date().getTime(),
        });
        var response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(
            this.messages.map((x) => ({
              content: x.body,
              role: x.author == 'you' ? 'user' : 'assistant',
            }))
          ),
        });
        if (response.status == 429) {
          console.warn('Rate limit exceeded');

          const retryAfter = response.headers.get('Retry-After');
          const waitTime = retryAfter ? parseInt(retryAfter, 10) * 1000 : 60000; // default to 1 minute

          const minutes = Math.floor(waitTime / 60000);
          const seconds = Math.floor((waitTime % 60000) / 1000);
          const retryMessage = `Rate limit exceeded. Please try again in ${minutes} minutes and ${seconds} seconds.`;

          const rateLimitMessage = {
            body: retryMessage,
            author: 'system',
            id: 'rate-limit-exceeded',
          };
          this.chat.messages.push(rateLimitMessage);

          this.inputDisabled = true;

          setTimeout(() => {
            this.chat.messages = this.chat.messages.filter(
              (msg) => msg.id !== 'rate-limit-exceeded'
            );
            this.inputDisabled = false;
          }, waitTime);

          this.rateLimitExceeded = true;
          return;
        }
        if (!response.ok) {
          throw new Error('Error sending message');
        }

        var title = await this.getTitle();
        if (title != null) {
          this.chat.title = title;
        }

        var response_body = await response.json();

        // Handle successful response
        this.chat.messages.push({
          body: marked.parse(response_body.content),
          author: 'assistant',
          date: new Date().getTime(),
        });

        this.saveHistory();
        this.rateLimitExceeded = false;
      } catch (error) {
        console.error('Error in sendMessage: ', error);
        this.chat.messages.pop();
      }
    },
    async getTitle() {
      if (this.messages.length > 1) {
        return null;
      }
      try {
        var response = await fetch('/api/title', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(
            this.messages.map((x) => ({
              content: x.body,
              role: x.author == 'you' ? 'user' : 'assistant',
            }))
          ),
        });
        if (response.status === 429) {
          console.warn('Rate limit exceeded');

          const retryAfter = response.headers.get('Retry-After');
          const waitTime = retryAfter ? parseInt(retryAfter, 10) * 1000 : 60000; // default to 1 minute

          const retryMessage = `Rate limit exceeded. Please try again in ${minutes} minutes and ${seconds} seconds.`;

          const rateLimitMessage = {
            body: retryMessage,
            author: 'system',
            id: 'rate-limit-exceeded',
          };
          this.chat.messages.push(rateLimitMessage);
          this.inputDisabled = true;

          setTimeout(() => {
            this.chat.messages = this.chat.messages.filter(
              (msg) => msg.id !== 'rate-limit-exceeded'
            );
            this.inputDisabled = false;
          }, waitTime);

          this.rateLimitExceeded = true;
          return null;
        }
        if (!response.ok) {
          throw new Error('Error getting title');
        }
        return (await response.json()).content;
      } catch (error) {
        console.error('Error in getTitle: ', error);
        return null;
      }
    },
    async saveHistory() {
      localStorage.setItem('chats', JSON.stringify(this.chats));
      if (Object.keys(this.chats).length == 0) {
        this.createNewChat();
      }
    },
  },
};
</script>
