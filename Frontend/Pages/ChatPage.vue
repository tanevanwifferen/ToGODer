<template>
  <div>
    <chat
      :message-list-prop="chatStore.messages"
      :prompts-list-prop="prompts"
      @on-message-was-sent="sendMessage"
    >
    </chat>
  </div>
</template>

<script>
export default {
  components: {
    chat: Vue.defineAsyncComponent(() =>
      loadModule('/Components/chat.vue', options)
    ),
  },
  setup() {
    const chatStore = useChatStore();
    return { chatStore };
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
        this.chatStore.chat.messages.push({
          ...message,
          date: new Date().getTime(),
        });
        var response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(
            this.chatStore.messages.map((x) => ({
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
          this.chatStore.chat.messages.push(rateLimitMessage);

          this.inputDisabled = true;

          setTimeout(() => {
            this.chatStore.chat.messages = this.chatStore.chat.messages.filter(
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
          this.chatStore.setTitle(title);
        }

        var response_body = await response.json();

        // Handle successful response
        this.chatStore.chat.messages.push({
          body: marked.parse(response_body.content),
          author: 'assistant',
          date: new Date().getTime(),
        });

        this.chatStore.saveChats();
        this.rateLimitExceeded = false;
      } catch (error) {
        console.error('Error in sendMessage: ', error);
        this.chatStore.chat.messages.pop();
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
          body: JSON.stringify(
            this.chatStore.messages.map((x) => ({
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
          this.chatStore.chat.messages.push(rateLimitMessage);
          this.inputDisabled = true;

          setTimeout(() => {
            this.chatStore.chat.messages = this.chatStore.chat.messages.filter(
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
  },
};
</script>
