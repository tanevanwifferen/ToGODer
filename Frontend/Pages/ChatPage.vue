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

        // If this is the first user message, request the title ONCE immediately,
        // before streaming starts and before we add any assistant placeholder.
        const isFirstTurn = this.chatStore.messages.length === 1;
        if (isFirstTurn) {
          try {
            const firstTurnTitle = await ChatApiClient.getTitle(
              this.chatStore.model,
              // Only send the user message(s) as context for the title
              [...this.chatStore.messages]
            );
            if (firstTurnTitle != null) {
              this.chatStore.setTitle(firstTurnTitle);
            }
          } catch (e) {
            // Ignore title errors; do not spam /title
            console.warn('Title fetch failed on first turn:', e?.message || e);
          }
        }

        // Take a snapshot of messages BEFORE adding the assistant placeholder,
        // so we don't send the empty assistant message to the backend.
        const messagesSnapshot = [...this.chatStore.messages];

        // Stream the assistant response to avoid long waits and fix UI deletion issues
        // Start with a visible placeholder so users see immediate feedback on the first message.
        let content = '';
        const assistantId = this.chatStore.addMessage({
          body: '…', // visible typing placeholder
          author: 'assistant',
          date: new Date().getTime(),
        });

        // Watchdog: if no first chunk arrives quickly (e.g., first message), fallback to non-streaming.
        let gotFirstChunk = false;
        let cancelled = false;
        const watchdogMs = 2500;
        const watchdog = setTimeout(async () => {
          if (!gotFirstChunk && !cancelled) {
            try {
              const fallback = await ChatApiClient.sendMessage(
                this.chatStore.model,
                this.chatStore.humanPrompt,
                this.chatStore.keepGoing,
                this.chatStore.outsideBox,
                this.chatStore.communicationStyle,
                messagesSnapshot
              );
              cancelled = true; // ignore any late stream chunks
              this.chatStore.updateMessage(assistantId, {
                body: fallback.content || '(no content)',
                signature: fallback.signature,
              });
            } catch (e) {
              if (!content) {
                this.chatStore.updateMessage(assistantId, {
                  body: 'The server is taking too long to respond. Please try again.',
                });
              }
            }
          }
        }, watchdogMs);

        await ChatApiClient.streamMessage(
          this.chatStore.model,
          this.chatStore.humanPrompt,
          this.chatStore.keepGoing,
          this.chatStore.outsideBox,
          this.chatStore.communicationStyle,
          messagesSnapshot,
          {
            onChunk: (delta) => {
              if (cancelled) return;
              gotFirstChunk = true;
              content += delta || '';
              this.chatStore.updateMessage(assistantId, { body: content });
            },
            onSignature: (signature) => {
              if (cancelled) return;
              if (signature) {
                this.chatStore.updateMessage(assistantId, { signature });
              }
            },
            onDone: async () => {
              clearTimeout(watchdog);
              if (cancelled) return;
              // Title is now requested once, right after sending the first user message.
              // No title request here to avoid multiple /title calls during stream chunks.
            },
            onError: (msg) => {
              clearTimeout(watchdog);
              if (cancelled) return;
              if (!content) {
                this.chatStore.updateMessage(assistantId, {
                  body:
                    msg ||
                    'An error occurred while streaming the response. Please try again.',
                });
              }
            },
          }
        );

        this.rateLimitExceeded = false;
      } catch (error) {
        if (error.type === 'RateLimit') {
          await this.handleRateLimit(error);
        } else {
          console.error('Error in sendMessage:', error);
          // Do not delete user or assistant messages on error. Show a system message instead.
          this.chatStore.addMessage({
            body: 'An error occurred while sending the message. Please try again.',
            author: 'system',
            date: new Date().getTime(),
            id: 'send-error-' + Date.now(),
          });
        }
      }
    },
    // Deprecated: Title is fetched once right after the first user message in sendMessage().
    // Kept for compatibility if called elsewhere (e.g., experiences).
    async getTitle(messagesOverride = null) {
      try {
        const messagesToUse = messagesOverride ?? this.chatStore.messages;
        return await ChatApiClient.getTitle(
          this.chatStore.model,
          messagesToUse
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
