import { create } from "zustand";
import * as SecureStore from "expo-secure-store";

interface AuthState {
  token: string | null;
  user: { id: string; name: string; email: string } | null;
  setAuth: (token: string, user: any) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  setAuth: async (token, user) => {
    await SecureStore.setItemAsync("userToken", token);
    set({ token, user });
  },
  logout: async () => {
    await SecureStore.deleteItemAsync("userToken");
    set({ token: null, user: null });
  },
}));
