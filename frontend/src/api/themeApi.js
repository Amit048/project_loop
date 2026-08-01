import api from './authApi';

export const themeApi = {
  list: () => api.get('/themes'),
  getById: (id) => api.get(`/themes/${id}`),
  update: (id, data) => api.patch(`/themes/${id}`, data),
  merge: (id, sourceThemeId) => api.post(`/themes/${id}/merge`, { sourceThemeId }),
};

export default themeApi;
