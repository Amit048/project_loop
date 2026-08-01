import api from './authApi';

export const feedbackApi = {
  list: (params) => api.get('/feedback', { params }),
  getById: (id) => api.get(`/feedback/${id}`),
  create: (data) => api.post('/feedback', data),
  updateStatus: (id, status) => api.patch(`/feedback/${id}/status`, { status }),
  reclassify: (id) => api.post(`/feedback/${id}/reclassify`),
  reclassifyAll: () => api.post('/feedback/reclassify-all'),
  bulkUpload: (file, onUploadProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/feedback/bulk-upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
    });
  },
  simulateChannel: (channel, count = 15) =>
    api.post('/feedback/simulate-channel', { channel, count }),
};

export default feedbackApi;
