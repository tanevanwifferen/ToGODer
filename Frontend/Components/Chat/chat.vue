<script setup>
const chatStore = useChatStore();
</script>
<template>
  <div class="chat-container show">
    <v-overlay v-model="overlay" contained class="align-center justify-center">
      <div class="prompt-explanations">
        <table>
          <tr
            @click="setPreview(prompt)"
            v-for="prompt in Object.keys(promptsListProp)"
          >
            <td>
              <p>
                {{ prompt.replace('/', '') }}
              </p>
            </td>
            <td style="padding: 4px">
              {{ promptsListProp[prompt].description }}
            </td>
          </tr>
        </table>
      </div>
    </v-overlay>
    <div class="chat-window">
      <div
        ref="chatArea"
        class="chat-area"
        :style="{
          background: messageBackgroundColorProp,
        }"
      >
        <div class="placeholder" v-if="messageListProp.length == 0">
          <div class="templates">
            <div
              class="template"
              v-for="template in randomExamples"
              @click="
                youMessage = template.type + ' ' + template.content;
                handleOutboundMessage();
              "
            >
              <span class="template-promptselector">{{ template.title }}</span>
              <p>{{ template.content }}</p>
            </div>
          </div>
          <div
            class="promptsExplanation"
            style="
              display: flex;
              margin-top: 3%;
              align-items: center;
              justify-content: center;
            "
          >
            <v-btn @click="overlay = true">Show prompts help</v-btn>
          </div>
        </div>
        <div
          v-for="message in messageListProp"
          class="message d-flex flex-row"
          :style="[
            message.author === 'you'
              ? { background: messageOutColorProp }
              : { background: messageInColorProp },
          ]"
          :key="message.id || message.body"
          :class="{
            'message-out': message.author === 'you',
            'message-in': message.author !== 'you',
          }"
        >
          <p v-html="message.parsed" style="flex: auto"></p>
          <v-btn
            v-if="isSecureContext"
            density="compact"
            icon="mdi-checkbox-multiple-blank-outline"
            @click="copyText(message.body)"
          ></v-btn>
          <v-btn
            density="compact"
            icon="mdi-trash-can-outline"
            @click="chatStore.deleteMessage(message.id)"
          ></v-btn>
        </div>
      </div>
      <div class="chat-input">
        <form @submit.prevent="handleOutboundMessage()" class="chat-form">
          <textarea
            id="chatInput"
            v-model="youMessage"
            type="text"
            :placeholder="messagePlaceholder"
            :disabled="inputDisabled"
            autofocus
          />
          <div class="d-flex flex-col">
            <span>{{ characterCount }} / 5000</span>
            <button
              class="submit"
              type="submit"
              style="width: 10%"
              :disabled="inputDisabled"
            >
              <span
                class="fa fa-paper-plane"
                :style="{ color: iconColorProp, width: '100%' }"
              ></span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
const templateMessages = [
  {
    title: 'Individuation',
    content:
      'How can I take care of my family without losing myself in the process?',
    type: '/individuation',
  },
  {
    title: 'Ask ToGODer',
    content: 'How can I get more active consistently?',
    type: '',
  },
  {
    title: 'Deescalation',
    content: "I'm running out of money with a week to go",
    type: '/deescalation',
  },
  {
    title: 'Practical',
    content: 'How often should I be washing my bedsheets?',
    type: '/practical',
  },
  {
    title: 'Practical',
    content: 'How often should I be refreshing my oil?',
    type: '/practical',
  },
  {
    title: 'Scientific',
    content: 'What is consciousness?',
    type: '/scientific',
  },
  {
    title: 'Spiritual',
    content: 'How can I feel more connected to the universe?',
    type: '/spiritual',
  },
  {
    title: 'Arbitrage',
    content: 'How do I deal with a boss that micromanages my activities?',
    type: '/arbitrage',
  },
];

export default {
  name: 'Chat',
  inheritAttrs: false,
  props: {
    messagePlaceholder: {
      type: String,
      default: 'Type your message',
    },
    iconColorProp: {
      type: String,
      default: '#e6e6e6',
    },
    messageBackgroundColorProp: {
      type: String,
      default: '#ffffff',
    },
    messageOutColorProp: {
      type: String,
      default: '#3d7e9a',
    },
    messageInColorProp: {
      type: String,
      default: '#f1f0f0',
    },
    messageListProp: Array,
    promptsListProp: Object,
    inputDisabled: Boolean,
  },

  data: () => {
    return {
      youMessage: '',
      selected: '/default',
      templateMessages,
      overlay: false,
    };
  },

  watch: {
    messageListProp: {
      handler() {
        setTimeout(this.messageScroll, 5);
      },
      deep: true,
    },
    characterCount() {
      if (this.characterCount > 5000) {
        this.youMessage = this.youMessage.slice(0, 5000);
      }
    },
  },

  computed: {
    characterCount() {
      return this.youMessage.length;
    },
    isSecureContext() {
      return window.isSecureContext;
    },
    randomExamples() {
      var toreturn = [];
      var usedIndexes = [];
      while (toreturn.length < 3) {
        var randomIndex = Math.floor(
          Math.random() * this.templateMessages.length
        );
        if (
          !usedIndexes.includes(randomIndex) &&
          toreturn
            .map((x) => x.type)
            .indexOf(this.templateMessages[randomIndex].type) == -1
        ) {
          toreturn.push(this.templateMessages[randomIndex]);
          usedIndexes.push(randomIndex);
        }
      }
      return toreturn;
    },
  },

  methods: {
    copyText(text) {
      navigator.clipboard.writeText(text);
    },
    handleOutboundMessage() {
      if (!this.youMessage) {
        return;
      }
      this.$emit('onMessageWasSent', { body: this.youMessage, author: 'you' });
      this.youMessage = '';
      this.$nextTick(() => {
        this.messageScroll();
      });
    },
    setPrompt(prompt) {
      this.youMessage = prompt;
      document.getElementById('chatInput').focus();
    },
    messageScroll() {
      let messageDisplay = this.$refs.chatArea;
      messageDisplay.scrollTop = messageDisplay.scrollHeight;
    },
    handleKeyDown(event) {
      if (event.ctrlKey && event.key === 'Enter') {
        this.handleOutboundMessage();
      }
    },
    setPreview(selected) {
      this.selected = selected;
      this.youMessage = selected;
      this.overlay = false;
    },
  },
  mounted() {
    if (this.messageListProp) {
      this.messageScroll();
    }
    document.addEventListener('keydown', this.handleKeyDown);
  },
  beforeDestroy() {
    document.removeEventListener('keydown', this.handleKeyDown);
  },
};
</script>

<style scoped>
* {
  box-sizing: border-box;
}

.headline {
  text-align: center;
  font-weight: 100;
  color: white;
}

.chat-container {
  width: 100%;
  height: 100%;
  transform-origin: right bottom;
  overflow: scroll;
}

.prompt-explanations {
  padding: 2em;
  width: 90vw;
  height: 80vh;
  background-color: white;
  z-index: 10;
  box-shadow: 2px 2px 10px 2px rgba(0, 0, 0, 0.1);
  overflow: auto;
}

.prompt-explanations p {
  cursor: pointer;
  margin: 0.5em;
}

.chat-window {
  box-shadow: 2px 2px 10px 2px rgba(0, 0, 0, 0.1);
  width: 100%;
  height: 100%;
  display: grid;
  grid-template-rows: auto 6.8em;
}

.chat-area {
  border-radius: 3px 3px 0 0;
  padding: 1em 1em 0;
  position: relative;
  overflow: auto;
  width: 100vw;
  grid-row: 1;
}

.message {
  width: 100%;
  border-radius: 10px;
  padding: 0.5em;
  font-size: 1em;
  font-family: 'Arial', sans-serif;
  margin: 0.5em;
}

.message-out {
  color: #ffffff;
}

.message-in {
  background: #f1f0f0;
  color: black;
}

.templates {
  margin-top: 10vh;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
}

.template {
  background: #f1f0f0;
  border-radius: 10px;
  border: 1px solid #e9e9e9;
  margin: 0.5em;
  padding: 0.5em;
  width: 20vw;
  min-width: 15em;
}

.template-promptselector {
  font-size: 0.8em;
  font-weight: bold;
  margin-bottom: 0.5em;
  text-align: center;
  width: 100%;
}

.promptButtons {
  display: flex;
  flex-wrap: nowrap;
  overflow: auto;
  width: 100vw;
}

.chat-input {
  grid-row: 2;
}

.chat-input textarea {
  border: none;
  font-size: 0.8em;
  outline: none;
  padding: 1em;
  width: 90%;
}

.chat-form {
  background: #ffffff;
  border-top: 1px solid #e9e9e9;
  border-radius: 0 0 3px 3px;
  display: flex;
  flex-direction: row;
  align-items: center;
  overflow: hidden;
  width: 100%;
}

.submit {
  -webkit-appearance: none;
  background: transparent;
  border: 0;
  cursor: pointer;
}

.submit:focus {
  outline: none;
}

.submit-icon {
  width: 20px;
}

.chat-container.show .close-chat {
  animation: scaleIn 0.15s ease-in-out 0.3s 1 normal forwards;
}

@keyframes scaleIn {
  0% {
    transform: scale(0);
  }

  100% {
    transform: scale(1);
  }
}
</style>
