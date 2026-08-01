import { create } from 'zustand';
import { workspaceApi } from '../api/workspaceApi';

const useWorkspaceStore = create((set, get) => ({
  workspace: null,
  members: [],
  isLoading: false,
  error: null,

  fetchWorkspace: async () => {
    try {
      const { data } = await workspaceApi.getWorkspace();
      set({ workspace: data.data.workspace });
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to load workspace' });
    }
  },

  fetchMembers: async () => {
    try {
      const { data } = await workspaceApi.listMembers();
      set({ members: data.data.members });
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to load members' });
    }
  },

  // Runs both together and manages isLoading/error exactly once, so a
  // failure in one call doesn't leave the page permanently stuck behind an
  // error screen if the other call actually succeeded.
  fetchAll: async () => {
    set({ isLoading: true, error: null });
    const results = await Promise.allSettled([
      workspaceApi.getWorkspace(),
      workspaceApi.listMembers(),
    ]);
    const [wsResult, membersResult] = results;

    const updates = { isLoading: false };
    if (wsResult.status === 'fulfilled') {
      updates.workspace = wsResult.value.data.data.workspace;
    }
    if (membersResult.status === 'fulfilled') {
      updates.members = membersResult.value.data.data.members;
    }
    // Only show a blocking error if BOTH calls failed — a single failed
    // call still lets the page render with whatever data did load.
    if (wsResult.status === 'rejected' && membersResult.status === 'rejected') {
      updates.error =
        wsResult.reason.response?.data?.message || 'Failed to load workspace settings';
    }
    set(updates);
  },

  inviteMember: async (payload) => {
    try {
      const { data } = await workspaceApi.inviteMember(payload);
      set({ members: [...get().members, data.data.member] });
      return { success: true, tempPassword: data.data.tempPassword, message: data.message };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Invite failed' };
    }
  },

  updateMemberRole: async (id, role) => {
    try {
      const { data } = await workspaceApi.updateMemberRole(id, role);
      set({
        members: get().members.map((m) => (m._id === id ? data.data.member : m)),
      });
      return { success: true };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Update failed' };
    }
  },

  removeMember: async (id) => {
    try {
      await workspaceApi.removeMember(id);
      set({ members: get().members.filter((m) => m._id !== id) });
      return { success: true };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Remove failed' };
    }
  },
}));

export default useWorkspaceStore;
