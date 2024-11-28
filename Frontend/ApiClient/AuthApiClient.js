export default class AuthApiClient {
  static async refreshBilling(token) {
    const response = await fetch('/api/billing', {
      method: 'GET',
      headers: {
        Authorization: 'Bearer ' + token,
      },
    });
    return await response.json();
  }

  static async refreshToken(token, userId) {
    const response = await fetch('/api/auth/updateToken', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId }),
    });
    return await response.json();
  }

  static async createUser(email, password) {
    const response = await fetch('/api/auth/signUp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    return await response.text();
  }

  static async login(email, password) {
    const response = await fetch('/api/auth/signIn', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    return await response.json();
  }

  static async sendForgotPasswordEmail(email) {
    const response = await fetch('/api/auth/forgotPassword/' + email, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return await response.json();
  }

  static async setNewPassword(code, email, password) {
    const response = await fetch('/api/auth/resetPassword/' + code, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    return await response.json();
  }
}
