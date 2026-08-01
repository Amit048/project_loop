import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi } from '../api/authApi';

const useAuthStore = create(
    persist(
        (set, get) => ({
            user: null,
            accessToken: null,
            refreshToken: null,
            isLoading: false,
            error: null,

            isAuthenticated: () => !!get().accessToken && !!get().user,


            // SIGNUP
            signup: async (name, email, password) => {
                set({ isLoading: true, error: null });
                try {
                    const { data } = await authApi.signup({ name, email, password });
                    const { user, accessToken, refreshToken } = data.data;

                    // Save tokens in localStorage (also for Axios interceptor)
                    localStorage.setItem('accessToken', accessToken);
                    localStorage.setItem('refreshToken', refreshToken);

                    set({ user, accessToken, refreshToken, isLoading: false });
                    return { success: true };

                } catch (error) {
                    const message = error.response?.data?.message || 'Signup failed. Please try again.';
                    set({ error: message, isLoading: false });
                    return { success: false, message };
                }
            },

            // LOGIN
            login: async (email, password) => {
                set({ isLoading: true, error: null });
                try {
                    const { data } = await authApi.login({ email, password });
                    const { user, accessToken, refreshToken } = data.data;

                    localStorage.setItem('accessToken', accessToken);
                    localStorage.setItem('refreshToken', refreshToken);

                    set({ user, accessToken, refreshToken, isLoading: false });
                    return { success: true };

                } catch (error) {
                    const message = error.response?.data?.message || 'Login failed. Please try again.';
                    set({ error: message, isLoading: false });
                    return { success: false, message };
                }
            },

            // LOGOUT
            logout: async () => {
                const { refreshToken } = get();
                try {
                    await authApi.logout(refreshToken);
                } finally {
                    // Always clear local state even if API call fails
                    localStorage.removeItem('accessToken');
                    localStorage.removeItem('refreshToken');
                    set({ user: null, accessToken: null, refreshToken: null, error: null });
                }
            },

            // CHANGE PASSWORD
            changePassword: async (oldPassword, newPassword) => {
                try {
                    const { data } = await authApi.changePassword(oldPassword, newPassword);
                    const { accessToken, refreshToken } = data.data;

                    // Server rotates tokens (and revokes other sessions) on
                    // password change — keep the current session logged in
                    // by persisting the new pair, same as login/signup do.
                    localStorage.setItem('accessToken', accessToken);
                    localStorage.setItem('refreshToken', refreshToken);
                    set({ accessToken, refreshToken });

                    return { success: true, message: data.message };
                } catch (error) {
                    const message = error.response?.data?.message || 'Password change failed. Please try again.';
                    return { success: false, message };
                }
            },

            // CLEAR ERROR
            clearError: () => set({ error: null })
        }),
        {
            name: 'projectloop-auth', // localStorage key
            partialize: (state) => ({
                user: state.user,
                accessToken: state.accessToken,
                refreshToken: state.refreshToken
            })
        }
    )
);

export default useAuthStore;
