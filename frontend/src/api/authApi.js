import axios from 'axios';
import useUiStore from '../store/uiStore';

// ─── Base Axios Instance ───────────────────────────────────────────────────────
const api = axios.create({
  baseURL: '/api', // Vite proxy handles this → http://localhost:5100/api
  headers: { 'Content-Type': 'application/json' }
});

// ─── Request Interceptor: Attach access token + start the global loader ───────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    useUiStore.getState().beginRequest();
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor: Auto-refresh expired access tokens ─────────────────
api.interceptors.response.use(
  (response) => {
    useUiStore.getState().endRequest();
    return response;
  },

  async (error) => {
    useUiStore.getState().endRequest();

    const originalRequest = error.config;

    // Access Token Expired
    if (
      error.response?.status === 401 &&
      !originalRequest._retry
    ) {

      originalRequest._retry = true;

      try {

        const refreshToken = localStorage.getItem("refreshToken");

        // No refresh token
        if (!refreshToken) {

          localStorage.clear();

          window.location.href = "/login";

          return Promise.reject(error);
        }

        // Request new access token
        const { data } = await axios.post(
          "/api/auth/refresh",
          {
            refreshToken,
          }
        );

        // Save new tokens
        localStorage.setItem(
          "accessToken",
          data.data.accessToken
        );

        localStorage.setItem(
          "refreshToken",
          data.data.refreshToken
        );

        // Attach new token
        originalRequest.headers.Authorization =
          `Bearer ${data.data.accessToken}`;

        // Retry original request
        return api(originalRequest);

      } catch (refreshError) {

        // Refresh token invalid
        localStorage.clear();

        window.location.href = "/login";

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// ─── Auth API Methods ─────────────────────────────────────────────────────────
export const authApi = {
  signup:  (data) => api.post('/auth/signup', data),
  login:   (data) => api.post('/auth/login', data),
  logout:  (refreshToken) => api.post('/auth/logout', { refreshToken }),
  getMe:   () => api.get('/auth/me'),
  refresh: (refreshToken) => api.post('/auth/refresh', { refreshToken }),
  changePassword: (oldPassword, newPassword) =>
    api.patch('/auth/change-password', { oldPassword, newPassword })
};

export default api;
