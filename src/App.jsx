import React, { useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore, SCREENS } from "./store/useStore";

import { BottomNav } from "./components/ui";
import { Toaster } from "react-hot-toast";
import toast from "react-hot-toast";
import { clearToken } from "./api/client";
import { LoginScreen } from "./pages/auth/LoginScreen";
import { OnboardingScreen } from "./pages/OnboardingScreen";
import { HomeScreen } from "./pages/HomeScreen";
import { ScanScreen } from "./pages/ScanScreen";
import { AnalysisScreen } from "./pages/AnalysisScreen";
import { ProgressScreen } from "./pages/ProgressScreen";
import { MealPlanScreen } from "./pages/MealPlanScreen";
import { ProfileScreen } from "./pages/ProfileScreen";
import { WaterTrackerScreen } from "./pages/WaterTrackerScreen";
import { DetoxScreen } from "./pages/DetoxScreen";

const HIDE_NAV = [SCREENS.LOGIN, SCREENS.ONBOARDING, SCREENS.SCAN, SCREENS.ANALYSIS];

function PhoneShell({ children }) {
  return (
    <div className="mx-auto h-[844px] w-[390px] overflow-hidden rounded-[34px] bg-white shadow-[0_28px_80px_rgba(244,63,94,0.18)] ring-1 ring-black/5">
      <div className="flex h-full flex-col bg-gradient-to-b from-[#fff4f6] via-white to-[#fff8f9]">
        <div className="flex h-8 items-center justify-between px-5 pt-2 text-[10px] font-semibold text-slate-700">
          <span>9:41</span>
          <span>◔  ◕  ▰</span>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function BerryApp() {
  const { screen, token, userProfile, logout, setScreen } = useStore();

  // Global 401 handler — any API call that gets "Invalid or expired token"
  // fires this event. We clear both storage keys, reset Zustand state, and
  // redirect to login so the user gets a clean re-auth prompt.
  useEffect(() => {
    const handle401 = () => {
      clearToken();
      logout();
      toast.error("Session expired — please sign in again.", { id: "session-expired", duration: 4000 });
    };
    window.addEventListener("berry:unauthorized", handle401);
    return () => window.removeEventListener("berry:unauthorized", handle401);
  }, [logout]);

  const activeScreen = token && screen === SCREENS.LOGIN ? SCREENS.HOME : screen;

  const Current = useMemo(() => {
    if (!token) return <LoginScreen />;
    // First-time users: show onboarding before home
    if (!userProfile && activeScreen === SCREENS.HOME) return <OnboardingScreen />;

    switch (activeScreen) {
      case SCREENS.HOME:          return <HomeScreen />;
      case SCREENS.ONBOARDING:    return <OnboardingScreen />;
      case SCREENS.SCAN:          return <ScanScreen />;
      case SCREENS.ANALYSIS:      return <AnalysisScreen />;
      case SCREENS.PROGRESS:      return <ProgressScreen />;
      case SCREENS.WATER_TRACKER: return <WaterTrackerScreen />;
      case SCREENS.DETOX:         return <DetoxScreen />;
      case SCREENS.MEAL_PLAN:     return <MealPlanScreen />;
      case SCREENS.PROFILE:       return <ProfileScreen />;
      default:                    return <HomeScreen />;
    }
  }, [activeScreen, token, userProfile]);

  const showNav = token && !!userProfile && !HIDE_NAV.includes(activeScreen);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#e9e9e9] p-6">
      <PhoneShell>
        <div className="relative flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={screen}
              className="absolute inset-0 flex flex-col overflow-hidden"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.22 }}
            >
              {Current}
            </motion.div>
          </AnimatePresence>
          {showNav && <BottomNav />}
        </div>
      </PhoneShell>
      <Toaster position="top-center" toastOptions={{ duration: 3000, style: { background: '#333', color: '#fff', borderRadius: '12px' } }} />
    </div>
  );
}
