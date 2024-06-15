const lastDonateKey = 'lastDonateQuestion';

localStorage.getItem(lastDonateKey) ||
  localStorage.setItem(lastDonateKey, new Date().getTime());

const useGlobalStore = Pinia.defineStore('global', {
  state: () => ({
    sidebarVisible: false,
    links: [],
    donateOptions: [],
    quote: '',
    initialized: false,
    donateViewVisible: false,
    lastDonateQuestion: Number(localStorage.getItem(lastDonateKey)),
  }),
  actions: {
    async initGlobalStore() {
      this.initialized = true;
      try {
        var response = await fetch('/api/global_config');
        var data = await response.json();
        this.links = data.links;
        this.donateOptions = data.donateOptions;
        this.quote = data.quote;
      } catch (e) {
        console.warn('error initializing global store', e);
      }
    },
    setLastDonateQuestion() {
      this.lastDonateQuestion = new Date().getTime();
      localStorage.setItem(lastDonateKey, this.lastDonateQuestion);
    },
    askForDonation() {
      debugger;
      if (
        new Date().getTime() - this.lastDonateQuestion >
        1000 * 60 * 60 * 24
      ) {
        this.donateViewVisible = true;
        this.setLastDonateQuestion();
      }
    },
  },
});
