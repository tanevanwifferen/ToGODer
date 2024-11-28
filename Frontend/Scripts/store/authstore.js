const authPrefix = 'auth_';
const tokenKey = authPrefix + 'token';
const emailKey = authPrefix + 'email';
const userIdKey = authPrefix + 'userId';
const tokenExpiresKey = authPrefix + 'tokenExpires';

const useAuthStore = Pinia.defineStore('auth', {
  state: () => ({
    email: localStorage.getItem(emailKey) || '',
    password: '',
    token: localStorage.getItem(tokenKey) || '',
    userId: localStorage.getItem(userIdKey) || '',
    tokenExpires:
      parseInt(localStorage.getItem(tokenExpiresKey)) || new Date().getTime(),
    refreshIntervalId: null,
    cost: 0,
  }),
  actions: {
    initAuthStore() {
      // clear data if token is expired
      if (
        this.token &&
        this.tokenExpires < new Date().getTime() - 24 * 60 * 60 * 1000
      ) {
        this.logout();
      }
      if (!this.refreshIntervalId) {
        this.refreshIntervalId = setInterval(
          () => {
            this.token && this.refreshToken();
          },
          1000 * 60 * 5
        );
      }
    },
    async refreshBilling() {
      try {
        const data = await refreshBilling(this.token);
        if (data.error) {
          console.error('error refreshing billing', data.error);
          return;
        }
        this.cost = data.balance;
      } catch (e) {
        console.error('error refreshing billing', e);
        await this.logout();
      }
    },
    async refreshToken() {
      try {
        const data = await refreshToken(this.token, this.userId);
        if (data.error) {
          console.error('error refreshing token', data.error);
          return;
        }
        this.token = data.token;
        localStorage.setItem(tokenKey, this.token);
      } catch (e) {
        console.error('error refreshing token', e);
        await this.logout();
      }
    },
    async createUser() {
      try {
        const data = await createUser(this.email, this.password);
        if (!data) {
          console.error('error creating user');
          return 'An error has occurred. Please try again later.';
        }
        return data;
      } catch (e) {
        console.error('error creating user', e);
      }
    },
    async login() {
      try {
        const data = await login(this.email, this.password);
        if (data.error) {
          console.error('error logging in', data.error);
          return;
        }
        this.token = data.token;
        this.userId = data.userId;
        this.tokenExpires = data.date;
        localStorage.setItem(tokenExpiresKey, this.tokenExpires);
        localStorage.setItem(tokenKey, this.token);
        localStorage.setItem(userIdKey, this.userId);
        localStorage.setItem(emailKey, this.email);
        this.refreshBilling();
      } catch (e) {
        console.error('error logging in', e);
      }
    },
    async logout() {
      this.token = '';
      this.userId = '';
      localStorage.removeItem(tokenKey);
      localStorage.removeItem(tokenExpiresKey);
      localStorage.removeItem(userIdKey);
    },
    async sendForgotPasswordEmail() {
      try {
        const data = await sendForgotPasswordEmail(this.email);
        if (!data) {
          console.error('error sending request');
          return 'An error has occurred. Please try again later.';
        }
        return 'If this account exists, a password reset email will be sent. Copy the code into the next view.';
      } catch (e) {
        console.error('error creating user', e);
      }
    },
    async setNewPassword(code) {
      try {
        const data = await setNewPassword(code, this.email, this.password);
        if (!data) {
          console.error('error sending request');
          return 'An error has occurred. Please try again later.';
        }
        return data;
      } catch (e) {
        console.error('error creating user', e);
      }
    },
  },
});
