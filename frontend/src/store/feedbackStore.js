import { create } from 'zustand';
import { feedbackApi } from '../api/feedbackApi';

const DEFAULT_FILTERS = {
  search: '',
  channel: '',
  sentiment: '',
  status: '',
  themeId: '',
  dateFrom: '',
  dateTo: '',
};

const useFeedbackStore = create((set, get) => ({
  items: [],
  pagination: { page: 1, limit: 20, total: 0, totalPages: 1 },
  filters: { ...DEFAULT_FILTERS },
  isLoading: false,
  error: null,

  setFilters: (partial) =>
    set({ filters: { ...get().filters, ...partial }, pagination: { ...get().pagination, page: 1 } }),

  resetFilters: () => set({ filters: { ...DEFAULT_FILTERS } }),

  setPage: (page) => set({ pagination: { ...get().pagination, page } }),

  fetchFeedback: async () => {
    set({ isLoading: true, error: null });
    try {
      const { filters, pagination } = get();
      const params = { ...filters, page: pagination.page, limit: pagination.limit };
      Object.keys(params).forEach((k) => params[k] === '' && delete params[k]);

      const { data } = await feedbackApi.list(params);
      set({ items: data.data.items, pagination: data.data.pagination, isLoading: false });
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to load feedback', isLoading: false });
    }
  },

  createFeedback: async (payload) => {
    try {
      const { data } = await feedbackApi.create(payload);
      await get().fetchFeedback();
      return { success: true, feedback: data.data.feedback };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Create failed' };
    }
  },

  updateStatus: async (id, status) => {
    // Optimistic update
    const previous = get().items;
    set({ items: previous.map((f) => (f._id === id ? { ...f, status } : f)) });
    try {
      await feedbackApi.updateStatus(id, status);
      return { success: true };
    } catch (error) {
      set({ items: previous }); // rollback
      return { success: false, message: error.response?.data?.message || 'Update failed' };
    }
  },

  reclassify: async (id) => {
    try {
      const { data } = await feedbackApi.reclassify(id);
      set({
        items: get().items.map((f) => (f._id === id ? data.data.feedback : f)),
      });
      return { success: true };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Reclassify failed' };
    }
  },
}));

export default useFeedbackStore;
