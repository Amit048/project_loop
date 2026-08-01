import api from './authApi';

export const workspaceApi = {
  getWorkspace: () => api.get('/workspace'),
  listMembers: () => api.get('/workspace/members'),
  inviteMember: (data) => api.post('/workspace/invite', data),
  updateMemberRole: (id, role) => api.patch(`/workspace/members/${id}/role`, { role }),
  removeMember: (id) => api.delete(`/workspace/members/${id}`),
};

export default workspaceApi;
