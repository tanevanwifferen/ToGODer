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
    async refreshToken() {
      try {
        var response = await fetch('/api/auth/updateToken', {
          method: 'POST',
          headers: {
            Authorization: 'Bearer ' + this.token,
          },
        });
        var data = await response.json();
        if (data.error) {
          console.error('error refreshing token', data.error);
          return;
        }
        this.token = data.token;
        localStorage.setItem(tokenKey, this.token);
      } catch (e) {
        console.error('error refreshing token', e);
        this.logout();
      }
    },
    async createUser() {
      try {
        var response = await fetch('/api/auth/signUp', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: this.email,
            password: this.password,
          }),
        });
        if (!response.ok) {
          console.error('error creating user', data.error);
          return 'An error has occurred. Please try again later.';
        }
        return 'A verification email has been sent to your email address. Please verify your email address to login.';
      } catch (e) {
        console.error('error creating user', e);
      }
    },
    async login() {
      try {
        var response = await fetch('/api/auth/signIn', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: this.email,
            password: this.password,
          }),
        });
        var data = await response.json();
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
        var response = await fetch('/api/auth/forgotPassword/' + this.email, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        if (!response.ok) {
          console.error('error sending request', data.error);
          return 'An error has occurred. Please try again later.';
        }
        return 'If this account exists, a password reset email will be sent. Copy the code into the next view.';
      } catch (e) {
        console.error('error creating user', e);
      }
    },
    async setNewPassword(code) {
      try {
        var response = await fetch('/api/auth/resetPassword/' + code, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: this.email,
            password: this.password,
          }),
        });
        if (!response.ok) {
          console.error('error sending request', data.error);
          return 'An error has occurred. Please try again later.';
        }
        return await response.text();
      } catch (e) {
        console.error('error creating user', e);
      }
    },
  },
});