import { create } from "zustand";

const useAuthStore = create((set) => ({
  user: null,
  token: null,
  isReady: false,

  setAuth: (user, token) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
    set({ user, token, isReady: true });

    const savedPrefs = localStorage.getItem("notificationPreferences");
    if (savedPrefs && !user.notificationPreferences) {
      try {
        const prefs = JSON.parse(savedPrefs);
        // Synchroniser avec le serveur en arrière-plan
        api.put("/users/me/notifications", prefs).catch(() => {});
      } catch {}
    }
  },

  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    set({ user: null, token: null, isReady: true });
  },

  initAuth: () => {
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");
    if (token && user) {
      set({ token, user: JSON.parse(user), isReady: true });
    } else {
      set({ isReady: true });
    }
  },
}));

export default useAuthStore;
