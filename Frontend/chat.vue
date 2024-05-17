<template>
  <div>
    <div class="chat-container" class="show">
      <div class="chat-window">
        <div
          ref="chatArea"
          class="chat-area"
          :style="{ background: messageBackgroundColorProp }"
        >
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
            v-if="messageListProp.length == 0 && youMessage.length == 0"
          >
            <div>
              <button
                v-for="prompt in promptsListProp"
                @click="youMessage += prompt + ' '"
              >
                {{ prompt.replace("/", "") }}
              </button>
            </div>
          </div>
          <form @submit.prevent="handleOutboundMessage()" class="chat-form">
            <input
              id="chatInput"
              v-model="youMessage"
              type="text"
              :placeholder="messagePlaceholder"
              autofocus
            />
            <button class="submit" type="submit" style="width: 10%">
              <span
                class="fa fa-paper-plane"
                :style="{ color: iconColorProp, width: '100%' }"
              ></span>
            </button>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "Chat",
  inheritAttrs: false,
  props: {
    messagePlaceholder: {
      type: String,
      default: "Type your message",
    },
    iconColorProp: {
      type: String,
      default: "#e6e6e6",
    },
    messageBackgroundColorProp: {
      type: String,
      default: "#ffffff",
    },
    messageOutColorProp: {
      type: String,
      default: "#3d7e9a",
    },
    messageInColorProp: {
      type: String,
      default: "#f1f0f0",
    },
    messageListProp: Array,
    promptsListProp: Array,
  },

  data: () => {
    return {
      youMessage: "",
    };
  },

  watch: {
    messageListProp() {
      this.messageScroll();
    },
  },

  methods: {
    handleOutboundMessage() {
      if (!this.youMessage) {
        return;
      }
      this.$emit("onMessageWasSent", { body: this.youMessage, author: "you" });
      this.youMessage = "";
      this.$nextTick(() => {
        this.messageScroll();
      });
    },
    setPrompt(prompt) {
      this.youMessage = prompt;
      document.getElementById("chatInput").focus();
    },
    messageScroll() {
      let messageDisplay = this.$refs.chatArea;
      messageDisplay.scrollTop = messageDisplay.scrollHeight;
    },
  },
  mounted() {
    this.isOpen = this.initOpenProp || false;
    if (this.messageListProp) {
      this.messageScroll();
    }
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
  position: absolute;
  bottom: 0;
  right: 0;
  top: 0;
  width: 100%;
  z-index: 10000;
  transform: scale(0);
  transform-origin: right bottom;
}
.chat-container.show {
  animation: scaleIn 0.15s ease-in-out 0s 1 normal forwards;
}
.chat-container.hide {
  display: none;
}
.chat-window {
  box-shadow: 2px 2px 10px 2px rgba(0, 0, 0, 0.1);
  width: 100%;
  height: 100%;
}
.chat-area {
  border-radius: 3px 3px 0 0;
  height: calc(100% - 3.8em);
  padding: 1em 1em 0;
  position: relative;
  overflow: auto;
  width: 100%;
}
.message {
  width: 100%;
  border-radius: 10px;
  padding: 0.5em;
  font-size: 1em;
  font-family: "Arial", sans-serif;
}
.message-out {
  color: #ffffff;
}
.message-in {
  background: #f1f0f0;
  color: black;
}
.chat-inputs {
  display: flex;
  justify-content: space-between;
}
.chat-input input {
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
.close-chat {
  position: absolute;
  right: -40px;
  top: -40px;
  width: 35px;
  border-radius: 50%;
  height: 35px;
  background: #f7f7f7;
  cursor: pointer;
  transform: scale(0);
}
.chat-container.show .close-chat {
  animation: scaleIn 0.15s ease-in-out 0.3s 1 normal forwards;
}
.close-chat svg {
  position: relative;
  left: -1px;
  top: 6px;
  width: 20px;
}
.open-chat {
  position: fixed;
  width: 70px;
  right: 50px;
  bottom: 25px;
  cursor: pointer;
  z-index: 900;
  transform: scale(0);
}
.open-chat.hide {
  display: none;
}
.open-chat.show {
  animation: scaleIn 0.15s ease-in-out 0.15s 1 normal forwards;
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
