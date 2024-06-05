<template>
  <div class="chat-container show">
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
              v-for="template in templateMessages"
              @click="
                youMessage = template.type + ' ' + template.content;
                handleOutboundMessage();
              "
            >
              <span class="template-promptselector">{{ template.title }}</span>
              <p>{{ template.content }}</p>
            </div>
          </div>
          <!--<p class="message message-in">
            Hi! I'm a chatbot built to handle all your personal requests. How
            can I help you today? I will respond in the language you ask me
            questions in.
            <br />
            <br />
            When you ask me a question, I will give you an analysis of the
            situation. Try pressing the buttons below to get a different robot
            that can help you with different needs.
            <br />
            <br />
            Want to discuss or contribute? Come chat with us on
            <a href="https://t.me/toGODer">Telegram</a>!
            <br />
            NOTE: I will NEVER be able to read what you discuss with the AI.
            OpenAI might be able to read your messages, but they will be linked
            to my api key so anonymous.
          </p>
          <select
            v-model="selected"
            v-on:change="setPreview(selected)"
            style="
              appearance: auto;
              -webkit-appearance: auto;
              border: 1px solid gray;
            "
          >
            <option
              v-for="prompt in Object.keys(promptsListProp)"
              :value="prompt"
            >
              {{ prompt.replace('/', '') }}
            </option>
          </select>
          <p
            class="message message-in"
            v-if="promptsListProp && promptsListProp[selected]"
            style="font-size: 11pt"
          >
            {{ promptsListProp[selected].description }}
          </p>
        --></div>
        <p
          v-for="message in messageListProp"
          :key="message.id || message.body"
          class="message"
          :style="[
            message.author === 'you'
              ? { background: messageOutColorProp }
              : { background: messageInColorProp },
          ]"
          :class="{
            'message-out': message.author === 'you',
            'message-in': message.author !== 'you',
          }"
          v-html="message.body"
        ></p>
      </div>
      <div class="chat-input">
        <div
          class="promptButtons"
          v-if="messageListProp.length == 0 && !youMessage.startsWith('/')"
        >
          <v-btn
            @click="setPreview(prompt)"
            v-for="prompt in Object.keys(promptsListProp)"
          >
            {{ prompt.replace('/', '') }}
          </v-btn>
        </div>
        <form @submit.prevent="handleOutboundMessage()" class="chat-form">
          <textarea
            id="chatInput"
            v-model="youMessage"
            type="text"
            :placeholder="messagePlaceholder"
            :disabled="inputDisabled"
            autofocus
          />
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
        </form>
      </div>
    </div>
  </div>
</template>

<script>
const templateMessages = [
  {
    title: 'Ask ToGODer',
    content: 'How can I get more active consistently?',
    type: '',
  },
  {
    title: 'Spiritual',
    content: 'What happens after we die?',
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
    };
  },

  watch: {
    messageListProp: {
      handler() {
        setTimeout(this.messageScroll, 5);
      },
      deep: true,
    },
  },

  methods: {
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
