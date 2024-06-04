class Chat {
  constructor(chatId) {
    this.chatId = chatId;
    this.messages = [];
    this.title = '';
    this.created = new Date().getTime();
  }
}
const useChatStore = Pinia.defineStore('chats', {
  // other options...
  state: () => ({
    chats: JSON.parse(localStorage.getItem('chats')) ?? {},
    chatId: null,
  }),
  getters: {
    chat() {
      this.createNewChat();
      return this.chats[this.chatId];
    },
    messages() {
      return this.chat.messages;
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
    setChats(chats) {
      this.chats = chats;
      this.saveChats();
    },
    saveChats() {
      var toSave = {};
      for (let key of Object.keys(this.chats)) {
        if (toSave[key]?.messages?.length > 0) {
          toSave[key] = this.chats[key];
        }
      }
      localStorage.setItem('chats', JSON.stringify(toSave));
    },
    createNewChat() {
      var id = uuidv4();
      this.chats[id] = new Chat(id);
      this.chatId = id;
      this.saveChats();
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
      this.chat.messages.push(message);
    },
    setTitle(title) {
      this.chat.title = title;
      this.saveChats();
    },
  },
});
