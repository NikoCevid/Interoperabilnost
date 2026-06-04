import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { UserInfo } from "../types";
import { tokenStorage } from "../services/api";
import { authService } from "../services/authService";

interface AuthState {
  user: UserInfo | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (
    username: string,
    email: string,
    password: string,
    role: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (username, password) => {
        set({ isLoading: true });
        try {
          const response = await authService.login({ username, password });
          tokenStorage.setTokens(response.accessToken, response.refreshToken);
          set({ user: response.user, isAuthenticated: true });
        } finally {
          set({ isLoading: false });
        }
      },

      register: async (username, email, password, role) => {
        set({ isLoading: true });
        try {
          const response = await authService.register({
            username,
            email,
            password,
            role,
          });
          tokenStorage.setTokens(response.accessToken, response.refreshToken);
          set({ user: response.user, isAuthenticated: true });
        } finally {
          set({ isLoading: false });
        }
      },

      logout: async () => {
        const refreshToken = tokenStorage.getRefresh();
        if (refreshToken) {
          try {
            await authService.revoke(refreshToken);
          } catch {}
        }
        tokenStorage.clear();
        set({ user: null, isAuthenticated: false });
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
