import api from "./api";
import type { AuthResponse, LoginPayload, RegisterPayload } from "../types";

export const authService = {
  login: async (payload: LoginPayload): Promise<AuthResponse> => {
    const { data } = await api.post<AuthResponse>("/auth/login", payload);
    return data;
  },

  register: async (payload: RegisterPayload): Promise<AuthResponse> => {
    const { data } = await api.post<AuthResponse>("/auth/register", payload);
    return data;
  },

  refresh: async (refreshToken: string): Promise<AuthResponse> => {
    const { data } = await api.post<AuthResponse>("/auth/refresh", {
      refreshToken,
    });
    return data;
  },

  revoke: async (refreshToken: string): Promise<void> => {
    await api.post("/auth/revoke", { refreshToken });
  },

  me: async () => {
    const { data } = await api.get("/auth/me");
    return data;
  },
};
