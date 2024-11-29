class ApiClient {
  static authStore = null;
  static axiosInstance = null;

  static initialize(authStore) {
    ApiClient.authStore = authStore;
    ApiClient.axiosInstance = axios.create({
      baseURL: '/api',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor for adding auth token
    ApiClient.axiosInstance.interceptors.request.use(
      (config) => {
        if (this.authStore?.token) {
          config.headers.Authorization = `Bearer ${this.authStore.token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor for handling common errors
    ApiClient.axiosInstance.interceptors.response.use(
      (response) => response.data,
      (error) => {
        if (error.response?.status === 429) {
          const retryAfter = error.response.headers['retry-after'];
          const waitTime = retryAfter ? parseInt(retryAfter, 10) * 1000 : 60000;
          return Promise.reject({
            type: 'RateLimit',
            waitTime,
            minutes: Math.floor(waitTime / 60000),
            seconds: Math.floor((waitTime % 60000) / 1000),
          });
        }
        return Promise.reject(error);
      }
    );
  }

  static async get(url, config = {}) {
    return ApiClient.axiosInstance.get(url, config);
  }

  static async post(url, data = {}, config = {}) {
    return ApiClient.axiosInstance.post(url, data, config);
  }

  static async put(url, data = {}, config = {}) {
    return ApiClient.axiosInstance.put(url, data, config);
  }

  static async delete(url, config = {}) {
    return ApiClient.axiosInstance.delete(url, config);
  }
}
