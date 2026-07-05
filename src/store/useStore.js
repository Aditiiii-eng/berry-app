import { create } from "zustand";
import { persist } from "zustand/middleware";

export const SCREENS = {
  LOGIN: "login",
  HOME: "home",
  SCAN: "scan",
  ANALYSIS: "analysis",
  PROGRESS: "progress",
  WATER_TRACKER: "water_tracker",
  DETOX: "detox",
  PROFILE: "profile",
  GOALS: "goals",
  HISTORY: "history",
  NOTIFICATIONS: "notifications",
  MEAL_PLAN: "mealPlan",
  CHAT: "chat",
  SETTINGS: "settings",
  ONBOARDING: "onboarding",
};

export const useStore = create(
  persist(
    (set) => ({
      // Hydration
      hydrated: false,
      setHydrated: (v) => set({ hydrated: v }),

      // Auth
      token: null,
      user: null,
      setToken: (token) => {
        if (token) localStorage.setItem("berry_token", token);
        set({ token });
      },
      setUser: (user) => set({ user }),
      logout: () => {
        localStorage.removeItem("berry_token");
        set({ token: null, user: null, userProfile: null, userGoals: null, dashboard: null, mealPlan: null, analysis: null, screen: SCREENS.LOGIN });
      },

      // Navigation
      screen: SCREENS.LOGIN,
      setScreen: (screen) => set({ screen }),

      // Onboarding / user profile
      userProfile: null,
      userGoals: null,
      setUserProfile: (userProfile) => set({ userProfile }),
      setUserGoals: (userGoals) => set({ userGoals }),

      // Feature state
      analysis: null,
      setAnalysis: (analysis) => set({ analysis }),

      dashboard: null,
      setDashboard: (dashboard) => set({ dashboard }),

      progress: null,
      setProgress: (progress) => set({ progress }),

      mealPlan: null,
      setMealPlan: (mealPlan) => set({ mealPlan }),

      // Global loading
      loading: false,
      setLoading: (loading) => set({ loading }),

      // Modal state (for future modals/notifications)
      modal: null,
      setModal: (modal) => set({ modal }),

      // Selected calendar date (not persisted — resets to today on reload)
      selectedDate: null,  // ISO string "YYYY-MM-DD" or null means today
      setSelectedDate: (d) => set({ selectedDate: d }),
    }),
    {
      name: "berry-app-storage",
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        userProfile: state.userProfile,
        userGoals: state.userGoals,
      }),
      onRehydrateStorage: () => (state) => {
        // Heal the "berry_token" localStorage key if it was wiped by a previous bug
        // (e.g. old client.js clearToken() side-effect) but Zustand still has the JWT.
        if (state?.token) {
          localStorage.setItem("berry_token", state.token);
        }
        state?.setHydrated(true);
      },
    }
  )
);
