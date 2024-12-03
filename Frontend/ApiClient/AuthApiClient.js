class AuthApiClient {
  static async refreshBilling(token) {
    return ApiClient.get('/billing');
  }

  static async refreshToken(token, userId) {
    return ApiClient.post('/auth/updateToken', { userId });
  }

  static async createUser(email, password) {
    return ApiClient.post('/auth/signUp', { email, password });
  }

  static async login(email, password) {
    return ApiClient.post('/auth/signIn', { email, password });
  }

  static async sendForgotPasswordEmail(email) {
    return ApiClient.post(`/auth/forgotPassword/${email}`);
  }

  static async setNewPassword(code, email, password) {
    return ApiClient.post(`/auth/resetPassword/${code}`, { email, password });
  }
}
