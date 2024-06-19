class Chat {
  constructor(chatId) {
    this.chatId = chatId;
    this.messages = [];
    this.title = '';
    this.created = new Date().getTime();
  }
}

const humanPromptKey = 'humanPrompt';
const keepGoingKey = 'keepGoing';
const communicationStyleKey = 'communicationStyle';

localStorage.getItem(humanPromptKey) ??
  localStorage.setItem(humanPromptKey, 'true');
localStorage.getItem(keepGoingKey) ??
  localStorage.setItem(keepGoingKey, 'true');
localStorage.getItem(communicationStyleKey) ??
  localStorage.setItem(communicationStyleKey, '0');

const useChatStore = Pinia.defineStore('chats', {
  // other options...
  state: () => ({
    chats: JSON.parse(localStorage.getItem('chats')) ?? {},
    chatId: null,
    humanPrompt: localStorage.getItem(humanPromptKey) == 'true',
    keepGoing: localStorage.getItem(humanPromptKey) == 'true',
    communicationStyle: parseInt(localStorage.getItem(communicationStyleKey)),
  }),
  getters: {
    chat() {
      if (this.chatId == null) {
        this.createNewChat();
      }
      return this.chats[this.chatId];
    },
    messages() {
      return this.chat.messages.map((x) => {
        return { ...x, parsed: marked.parse(x.body) };
      });
    },
    title() {
      return this.chat.title ?? 'ToGODer';
    },
    chatsOrderedByDateDescending() {
      var items = Object.values(this.chats);
      items.sort((a, b) => b.created - a.created);
      return items;
    },
  },
  actions: {
    saveChats() {
      var toSave = {};
      for (let key of Object.keys(this.chats)) {
        if (this.chats[key]?.messages?.length > 0) {
          toSave[key] = this.chats[key];
        }
      }
      localStorage.setItem('chats', JSON.stringify(toSave));
    },
    createNewChat() {
      var id = uuidv4();
      this.chats[id] = new Chat(id);
      this.chatId = id;
    },
    selectChat(chatId) {
      this.chatId = chatId;
    },
    deleteChat(chatId) {
      if (this.chatId == chatId) {
        this.createNewChat();
      }
      delete this.chats[chatId];
      this.saveChats();
    },
    addMessage(message) {
      message.id ??= uuidv4();
      this.chat.messages.push(message);
      this.saveChats();
    },
    deleteMessage(id) {
      this.chat.messages = this.chat.messages.filter((x) => x.id != id);
      this.saveChats();
    },
    setTitle(title) {
      this.chat.title = title;
      this.saveChats();
    },
  },
});
