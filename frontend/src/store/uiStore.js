import { create } from 'zustand';

// Small shared store for cross-cutting UI state (modals, sidebar toggle on
// mobile, global loading flags) so components don't have to prop-drill.
const useUiStore = create((set) => ({
  activeModal: null, // e.g. 'csvUpload' | 'inviteMember' | null
  openModal: (name) => set({ activeModal: name }),
  closeModal: () => set({ activeModal: null }),

  sidebarOpen: false,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  closeSidebar: () => set({ sidebarOpen: false }),

  // ─── Global request loader ──────────────────────────────────────────────
  // Incremented/decremented by axios interceptors in api/authApi.js so any
  // API call anywhere in the app automatically shows/hides the loader —
  // no per-page wiring needed. A counter (not a boolean) so overlapping
  // requests don't hide the loader early when only one of them finishes.
  pendingRequests: 0,
  beginRequest: () => set((s) => ({ pendingRequests: s.pendingRequests + 1 })),
  endRequest: () =>
    set((s) => ({ pendingRequests: Math.max(0, s.pendingRequests - 1) })),
}));

export default useUiStore;
