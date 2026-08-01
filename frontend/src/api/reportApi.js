import api from './authApi';

export const reportApi = {
  list: () => api.get('/reports'),
  getById: (id) => api.get(`/reports/${id}`),
  generate: (periodStart, periodEnd, title) =>
    api.post('/reports/generate', { periodStart, periodEnd, title }),
};

export default reportApi;
