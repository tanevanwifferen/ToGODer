class GlobalApiClient {
  static async getGlobalConfig() {
    return ApiClient.get('/global_config');
  }

  static async getPrompts() {
    return ApiClient.get('/prompts');
  }
}
