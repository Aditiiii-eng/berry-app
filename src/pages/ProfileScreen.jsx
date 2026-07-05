import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { 
  User, Bell, ShieldPlus, Gem, LogOut, Settings, 
  Pencil, ChevronRight, Weight, Ruler, Target, Trophy
} from "lucide-react";
import { useStore, SCREENS } from "../store/useStore";
import { getProfile, getUserGoals } from "../api/profile";
import { getWaterHistory, getWaterWeekly } from "../api/progress";
import { LoadingOverlay } from "../components/ui";

import { berry } from "../components/BerryUI";

function MenuRow({ icon: Icon, title, subtitle, tone, danger, onClick, rightBadge }) {
  const tones = {
    blue: "bg-blue-50 text-blue-500",
    orange: "bg-orange-50 text-orange-500",
    green: "bg-emerald-50 text-emerald-500",
    pink: "bg-rose-50 text-rose-500",
    slate: "bg-slate-100 text-slate-500",
  };

  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-4 rounded-[24px] bg-white p-4 shadow-sm transition-all active:scale-[0.98] active:bg-slate-50"
    >
      <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${tones[tone || "slate"]}`}>
        <Icon size={20} />
      </div>
      <div className="flex-1 text-left">
        <h4 className={`text-sm font-bold ${danger ? "text-rose-500" : "text-slate-800"}`}>{title}</h4>
        <p className="text-[11px] text-slate-400">{subtitle}</p>
      </div>
      {rightBadge}
      <ChevronRight size={18} className="text-slate-300" />
    </button>
  );
}

function StatCard({ label, value, unit, color = "rose" }) {
  const colors = {
    rose: "bg-rose-50 text-rose-500",
    emerald: "bg-emerald-50 text-emerald-500",
    blue: "bg-blue-50 text-blue-500",
  };

  return (
    <div className={`rounded-[24px] p-4 text-center ${colors[color]}`}>
      <p className="text-[9px] font-black uppercase tracking-wider opacity-60">
        {label}
      </p>

      <h3 className="mt-2 text-[18px] font-black">
        {value}
        <span className="ml-1 text-[9px] font-bold opacity-60">{unit}</span>
      </h3>
    </div>
  );
}

export function ProfileScreen() {
  const { user, logout, setScreen, userProfile, setUserProfile, setUserGoals, userGoals } = useStore();
  const [loading, setLoading] = useState(false);
  const [streak, setStreak] = useState(0);
  const [hasLogs, setHasLogs] = useState(false);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [profile, goals, weekRes, histRes] = await Promise.all([
          getProfile(),
          getUserGoals(),
          getWaterWeekly().catch(() => null),
          getWaterHistory().catch(() => null)
        ]);
        setUserProfile(profile);
        setUserGoals(goals);
        if (weekRes) {
          setStreak(weekRes.streak || 0);
        }
        if (histRes && histRes.logs) {
          setHasLogs(histRes.logs.length > 0);
        }
      } catch (err) {
        console.error("Failed to load profile data", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [setUserProfile, setUserGoals]);

  const handleLogout = () => {
    logout();
    setScreen(SCREENS.LOGIN);
  };

  // Convert cm to ft'in"
  const formatHeight = (cm) => {
    if (!cm) return "5'7\"";
    const inches = cm / 2.54;
    const ft = Math.floor(inches / 12);
    const in_ = Math.round(inches % 12);
    return `${ft}'${in_}"`;
  };

  return (
    <div className={berry.screen}>
      <LoadingOverlay loading={loading} />
      
      <header className={berry.header}>
        <div className="w-10" />

        <h1 className={berry.title}>Profile</h1>

        <button className="grid h-10 w-10 place-items-center rounded-full bg-white text-slate-400 shadow-sm">
          <Settings size={18} />
        </button>
      </header>

      <section className="mt-7 flex flex-col items-center">
        <div className="relative">
          <div className="h-28 w-28 overflow-hidden rounded-full border-4 border-white shadow-xl">
            <img 
              src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&backgroundColor=ffdfbf" 
              alt="Avatar" 
              className="h-full w-full object-cover"
            />
          </div>
          <div className="absolute bottom-1 right-1 grid h-8 w-8 place-items-center rounded-full bg-white text-rose-500 shadow-lg">
            🍓
          </div>
        </div>
        
        <h2 className="mt-4 text-[22px] font-black leading-6 text-slate-900">
          {user?.name || "Berry User"}
        </h2>
        <p className="mt-1 text-[12px] font-semibold text-slate-400">@{user?.email?.split('@')[0] || "berry_lover"}</p>

        <button onClick={() => setScreen(SCREENS.ONBOARDING)} className="mt-5 rounded-full bg-rose-500 px-6 py-3 text-[12px] font-black text-white shadow-lg shadow-rose-200">
          ✎ Edit Profile
        </button>
      </section>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h3 className={berry.label}>Health Stats</h3>
          <button onClick={() => setScreen(SCREENS.ONBOARDING)} className="text-[9px] font-black uppercase text-rose-500">
            Update
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <StatCard 
            label="Weight" 
            value={userProfile?.weight_kg ? Math.round(userProfile.weight_kg) : "—"} 
            unit="kg" 
            color="rose" 
          />
          <StatCard 
            label="Height" 
            value={formatHeight(userProfile?.height_cm)} 
            unit="" 
            color="emerald" 
          />
          <StatCard 
            label="Target" 
            value={130} 
            unit="lbs" 
            color="rose" 
          />
        </div>
      </section>

      <section className="mt-8">
        <h3 className={berry.label}>Daily Nutrition Goals</h3>
        <div className="mt-3 rounded-[28px] bg-[#071024] p-4 shadow-xl shadow-slate-200">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-[18px] bg-white/10 p-4">
              <p className="text-[9px] font-black uppercase text-slate-400">Calories</p>
              <h4 className="mt-2 text-[18px] font-black text-white">{Math.round(userGoals?.calories || 2200)}</h4>
              <p className="text-[9px] font-semibold text-slate-500">kcal</p>
            </div>
            <div className="rounded-[18px] bg-white/10 p-4">
              <p className="text-[9px] font-black uppercase text-slate-400">Protein</p>
              <h4 className="mt-2 text-[18px] font-black text-white">{Math.round(userGoals?.protein || 150)}g</h4>
              <p className="text-[9px] font-semibold text-slate-500">goals</p>
            </div>
            <div className="rounded-[18px] bg-white/10 p-4">
              <p className="text-[9px] font-black uppercase text-slate-400">Fiber</p>
              <h4 className="mt-2 text-[18px] font-black text-white">{Math.round(userGoals?.fiber || 25)}g</h4>
              <p className="text-[9px] font-semibold text-slate-500">daily</p>
            </div>
          </div>
        </div>
      </section>

      {/* Badges / Achievements Section */}
      <section className="mt-8">
        <h3 className={berry.label}>Earned Badges</h3>
        <div className="mt-3 flex flex-col gap-3">
          {[
            { id: "first_drop", emoji: "💧", label: "First Drop", desc: "Log your first glass", target: 1, unlocked: hasLogs },
            { id: "hydrated_5",  emoji: "🌊", label: "Hydration Hero", desc: "Hit goal 5 days",    target: 5, unlocked: streak >= 5 },
            { id: "streak_7",   emoji: "🏆", label: "Week Warrior",   desc: "7-day streak",       target: 7, unlocked: streak >= 7 },
            { id: "litre_3",    emoji: "⚡", label: "3L Club",        desc: "Drink 3L in one day", target: 3000, unlocked: streak >= 10 }
          ].map((a) => (
            <div
              key={a.id}
              className={`flex items-center gap-4 rounded-[22px] p-4 border transition-all shadow-sm ${
                a.unlocked
                  ? "bg-rose-50/50 border-rose-100"
                  : "bg-white border-slate-100"
              }`}
            >
              <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-2xl bg-slate-50`}>
                {a.emoji}
              </div>
              <div className="flex-1">
                <p className={`text-sm font-black ${a.unlocked ? "text-rose-500" : "text-slate-700"}`}>{a.label}</p>
                <p className="text-[11px] font-semibold text-slate-400">{a.desc}</p>
              </div>
              <Trophy size={18} className={a.unlocked ? "text-rose-500" : "text-slate-300"} />
            </div>
          ))}
        </div>
      </section>

      <SectionHeader title="Account" />
      <div className="space-y-3 pb-8">
        <MenuRow 
          icon={User} 
          title="Personal Information" 
          subtitle={user?.email || "Email, Phone, Address"} 
          tone="blue" 
        />
        <MenuRow 
          icon={Bell} 
          title="Notifications" 
          subtitle="Push, Email, SMS" 
          tone="orange" 
        />
        <MenuRow 
          icon={ShieldPlus} 
          title="Connected Apps" 
          subtitle="Google Health connected" 
          tone="green" 
          rightBadge={<span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />}
        />
        <MenuRow 
          icon={Gem} 
          title="Premium Subscription" 
          subtitle="Manage Plan" 
          tone="pink" 
        />
        <MenuRow 
          icon={LogOut} 
          title="Logout" 
          subtitle="Sign out of this Berry account" 
          tone="slate" 
          danger 
          onClick={handleLogout}
        />
      </div>
    </div>
  );
}

function SectionHeader({ title, action, onAction }) {
  return (
    <div className="mb-4 mt-10 flex items-center justify-between">
      <h3 className="text-[12px] font-black uppercase tracking-wider text-slate-400">{title}</h3>
      {action && (
        <button onClick={onAction} className="text-[10px] font-black uppercase tracking-widest text-rose-500 active:opacity-60">{action}</button>
      )}
    </div>
  );
}
