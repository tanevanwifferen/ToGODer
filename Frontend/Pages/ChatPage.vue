<template>
  <div>
    <toolbar></toolbar>
    <sidebar></sidebar>
    <v-row style="height: calc(100% - 64px)" class="ma-0">
      <chat
        :message-list-prop="chatStore.messages"
        :prompts-list-prop="prompts"
        @on-message-was-sent="sendMessage"
      >
      </chat>
      <donatewindow></donatewindow>
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
    donatewindow: Vue.defineAsyncComponent(() =>
      load('/Components/Donate/donatewindow.vue')
    ),
  },
  async setup() {
    const chatStore = useChatStore();
    const globalStore = useGlobalStore();
    await globalStore.initGlobalStore();
    return { chatStore, globalStore };
  },
  data() {
    return {
      prompts: [],
      rateLimitExceeded: false,
    };
  },
  async beforeCreate() {
    var prompts = await fetch('/api/prompts');
    this.prompts = await prompts.json();
  },
  methods: {
    async sendMessage(message) {
      try {
        if (message.body.toLowerCase() == 'debug') {
          this.debug = !this.debug;
          return;
        }
        this.chatStore.addMessage({
          ...message,
          date: new Date().getTime(),
        });
        var response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: this.chatStore.model,
            humanPrompt: this.chatStore.humanPrompt,
            keepGoing: this.chatStore.keepGoing,
            communicationStyleKey: this.chatStore.communicationStyle,
            prompts: this.chatStore.messages.map((x) => ({
              content: x.body,
              role: x.author == 'you' ? 'user' : 'assistant',
            })),
          }),
        });
        if (response.status == 429) {
          this.handleRateLimit(response);
          return;
        }
        if (!response.ok) {
          throw new Error('Error sending message');
        }

        var title = await this.getTitle();
        if (title != null) {
          this.chatStore.setTitle(title);
        }

        var response_body = await response.json();

        // Handle successful response
        this.chatStore.addMessage({
          body: response_body.content,
          author: 'assistant',
          date: new Date().getTime(),
        });

        this.rateLimitExceeded = false;
      } catch (error) {
        console.error('Error in sendMessage: ', error);
        this.chatStore.chat.messages.pop();
        this.chatStore.saveChats();
      }
    },
    async getTitle() {
      if (this.chatStore.messages.length > 1) {
        return null;
      }
      try {
        var response = await fetch('/api/title', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: this.chatStore.model,
            content: this.chatStore.messages.map((x) => ({
              content: x.body,
              role: x.author == 'you' ? 'user' : 'assistant',
            })),
          }),
        });
        if (response.status === 429) {
          this.handleRateLimit(response);
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
    async handleRateLimit(response) {
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
      this.chatStore.addMessage(rateLimitMessage);
      this.inputDisabled = true;

      setTimeout(() => {
        this.chatStore.chat.messages = this.chatStore.chat.messages.filter(
          (msg) => msg.id !== 'rate-limit-exceeded'
        );
        this.inputDisabled = false;
      }, waitTime);

      this.rateLimitExceeded = true;
    },
  },
};
</script>
