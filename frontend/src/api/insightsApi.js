import api from './authApi';

export const insightsApi = {
  getSummary: (params) => api.get('/insights/summary', { params }),
  getVolume: (params) => api.get('/insights/volume', { params }),
  getSentiment: () => api.get('/insights/sentiment'),
  getTopThemes: () => api.get('/insights/top-themes'),
  getTrends: () => api.get('/insights/trends'),
  ask: (question) => api.post('/insights/ask', { question }),
};

export default insightsApi;
