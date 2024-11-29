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
const outsideBoxKey = 'outsideBox';
const communicationStyleKey = 'communicationStyle';
const modelKey = 'model';
const defaultPromptKey = 'defaultPrompt';

localStorage.getItem(humanPromptKey) ??
  localStorage.setItem(humanPromptKey, 'true');
localStorage.getItem(keepGoingKey) ??
  localStorage.setItem(keepGoingKey, 'true');
localStorage.getItem(communicationStyleKey) ??
  localStorage.setItem(communicationStyleKey, '0');
localStorage.getItem(outsideBoxKey) ??
  localStorage.setItem(outsideBoxKey, 'true');
localStorage.getItem(modelKey) ??
  localStorage.setItem(modelKey, 'meta-llama/llama-3.2-90b-vision-instruct');

var existingDefaultPrompt = localStorage.getItem(defaultPromptKey);
(!!existingDefaultPrompt && existingDefaultPrompt != 'undefined') ||
  localStorage.setItem(defaultPromptKey, '/default');

const useChatStore = Pinia.defineStore('chats', {
  // other options...
  state: () => ({
    chats: JSON.parse(localStorage.getItem('chats')) ?? {},
    chatId: null,
    humanPrompt: localStorage.getItem(humanPromptKey) == 'true',
    keepGoing: localStorage.getItem(keepGoingKey) == 'true',
    outsideBox: localStorage.getItem(outsideBoxKey) == 'true',
    communicationStyle: parseInt(localStorage.getItem(communicationStyleKey)),
    model: localStorage.getItem(modelKey),
    defaultPrompt: localStorage.getItem(defaultPromptKey),
    prompts: null,
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
    promptsToDisplay() {
      return Object.keys(this.prompts).filter((x) => this.prompts[x].display);
    },
  },
  actions: {
    async initChatStore() {
      var prompts = await fetch('/api/prompts');
      this.prompts = await prompts.json();
    },
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
