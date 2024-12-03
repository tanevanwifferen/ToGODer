<template>
  <div>
    <toolbar></toolbar>
    <sidebar></sidebar>
    <v-row style="height: calc(100% - 64px)" class="ma-0">
      <chat
        :message-list-prop="chatStore.messages"
        :prompts-list-prop="chatStore.prompts"
        @on-message-was-sent="sendMessage"
        @on-experience-start="startExperience"
      >
      </chat>
      <donate-window></donate-window>
    </v-row>
  </div>
</template>

<script>
export default {
  components: {
    chat: Vue.defineAsyncComponent(() => load('/Components/Chat/chat.vue')),
    sidebar: Vue.defineAsyncComponent(() =>
      load('/Components/Chat/sidebar.vue')
    ),
    toolbar: Vue.defineAsyncComponent(() =>
      load('/Components/Chat/toolbar.vue')
    ),
    donateWindow: Vue.defineAsyncComponent(() =>
      load('/Components/Donate/donateWindow.vue')
    ),
  },
  async setup() {
    const chatStore = useChatStore();
    const globalStore = useGlobalStore();
    const authStore = useAuthStore();
    ApiClient.initialize(authStore);
    await globalStore.initGlobalStore();

    return { chatStore, globalStore, authStore };
  },
  data() {
    return {
      rateLimitExceeded: false,
      inputDisabled: false,
    };
  },
  async beforeCreate() {
    await this.chatStore.initChatStore();
  },
  methods: {
    async startExperience(evt) {
      try {
        const content = await ChatApiClient.startExperience(
          this.chatStore.model,
          evt.language
        );

        this.chatStore.addMessage({
          body: content,
          author: 'assistant',
          date: new Date().getTime(),
        });

        const title = await this.getTitle();
        if (title != null) {
          this.chatStore.setTitle(title);
        }
      } catch (error) {
        if (error.type === 'RateLimit') {
          await this.handleRateLimit(error);
        } else {
          console.error('Error in startExperience:', error);
        }
      }
    },
    async sendMessage(message) {
      try {
        if (message.body.toLowerCase() === 'debug') {
          this.debug = !this.debug;
          return;
        }
        if (this.chatStore.messages.length === 0 && message.body[0] !== '/') {
          message.body = this.chatStore.defaultPrompt + ' ' + message.body;
        }
        this.chatStore.addMessage({
          ...message,
          date: new Date().getTime(),
        });

        const response = await ChatApiClient.sendMessage(
          this.chatStore.model,
          this.chatStore.humanPrompt,
          this.chatStore.keepGoing,
          this.chatStore.outsideBox,
          this.chatStore.communicationStyle,
          this.chatStore.messages
        );

        const title = await this.getTitle();
        if (title != null) {
          this.chatStore.setTitle(title);
        }

        this.chatStore.addMessage({
          body: response.content,
          signature: response.signature,
          author: 'assistant',
          date: new Date().getTime(),
        });

        this.rateLimitExceeded = false;
      } catch (error) {
        if (error.type === 'RateLimit') {
          await this.handleRateLimit(error);
        } else {
          console.error('Error in sendMessage:', error);
          this.chatStore.chat.messages.pop();
          this.chatStore.saveChats();
        }
      }
    },
    async getTitle() {
      if (this.chatStore.messages.length > 1) {
        return null;
      }
      try {
        return await ChatApiClient.getTitle(
          this.chatStore.model,
          this.chatStore.messages
        );
      } catch (error) {
        if (error.type === 'RateLimit') {
          await this.handleRateLimit(error);
        } else {
          console.error('Error in getTitle:', error);
        }
        return null;
      }
    },
    async handleRateLimit(error) {
      console.warn('Rate limit exceeded');

      const retryMessage = `Rate limit exceeded. Please try again in ${error.minutes} minutes and ${error.seconds} seconds.`;

      const rateLimitMessage = {
        body: retryMessage,
        author: 'system',
        id: 'rate-limit-exceeded',
      };
      this.chatStore.addMessage(rateLimitMessage);
      this.inputDisabled = true;

      setTimeout(() => {
        this.chatStore.chat.messages = this.chatStore.chat.messages.filter(
          (msg) => msg.id !== 'rate-limit-exceeded'
        );
        this.inputDisabled = false;
      }, error.waitTime);

      this.rateLimitExceeded = true;
    },
  },
};
</script>
