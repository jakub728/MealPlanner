import { create } from "zustand";
import * as SecureStore from "expo-secure-store";

interface AuthState {
  token: string | null;
  user: { id: string; name: string; email: string } | null;
  isHydrated: boolean;
  setAuth: (token: string, user: any) => Promise<void>;
  logout: () => Promise<void>;
  init: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isHydrated: false,
  setAuth: async (token, user) => {
    await SecureStore.setItemAsync("userToken", token);
    await SecureStore.setItemAsync("userData", JSON.stringify(user));
    set({ token, user, isHydrated: true });
  },
  logout: async () => {
    await SecureStore.deleteItemAsync("userToken");
    await SecureStore.deleteItemAsync("userData");
    set({ token: null, user: null });
  },
  init: async () => {
    try {
      const token = await SecureStore.getItemAsync("userToken");
      const userData = await SecureStore.getItemAsync("userData");

      if (token && userData) {
        set({ token, user: JSON.parse(userData), isHydrated: true });
      } else {
        set({ isHydrated: true, token: null, user: null });
      }
    } catch (e) {
      set({ isHydrated: true, token: null, user: null });
    }
  },
}));
