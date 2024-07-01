const lastDonateKey = 'lastDonateQuestion';
const viewsSinceLastDonateKey = 'viewsSinceLastDonate';
const minage = 1000 * 60 * 60 * 24;

localStorage.getItem(lastDonateKey) ||
  localStorage.setItem(lastDonateKey, new Date().getTime());

localStorage.getItem(viewsSinceLastDonateKey) ||
  localStorage.setItem(viewsSinceLastDonateKey, 0);

const useGlobalStore = Pinia.defineStore('global', {
  state: () => ({
    sidebarVisible: false,
    links: [],
    donateOptions: [],
    quote: '',
    initialized: false,
    donateViewVisible: false,
    lastDonateQuestion: Number(localStorage.getItem(lastDonateKey)),
    models: [],
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
        this.models = data.models;
        localStorage.getItem('model') ??
          localStorage.setItem('model', data.models[0]);

        if (data.donateOptions.length > 0) {
          var views = parseInt(localStorage.getItem(viewsSinceLastDonateKey));
          if (views > 4) {
            this.askForDonation();
          } else {
            localStorage.setItem(viewsSinceLastDonateKey, views + 1);
          }
        }
      } catch (e) {
        console.warn('error initializing global store', e);
      }
    },
    setLastDonateQuestion() {
      this.lastDonateQuestion = new Date().getTime();
      localStorage.setItem(lastDonateKey, this.lastDonateQuestion);
    },
    askForDonation() {
      if (!this.donateOptions || this.donateOptions.length == 0) {
        return;
      }
      let time = new Date().getTime();
      if (time - this.lastDonateQuestion < minage) {
        return;
      }
      this.donateViewVisible = true;
      this.setLastDonateQuestion();
      localStorage.setItem(viewsSinceLastDonateKey, 0);
    },
  },
});
