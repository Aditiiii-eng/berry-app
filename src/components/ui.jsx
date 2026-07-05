import React from "react";
import { Loader2, Flame, Home, BarChart3, Plus, User, CalendarDays, Droplets, Leaf } from "lucide-react";
import { useStore, SCREENS } from "../store/useStore";

export function LoadingOverlay({ loading }) {
  if (!loading) return null;
  return (
    <div className="absolute inset-0 z-40 grid place-items-center bg-white/60 backdrop-blur-sm">
      <Loader2 className="animate-spin text-red-500" />
    </div>
  );
}

export function Header({ data }) {
  return (
    <div className="mt-4 flex items-center justify-between">
      <h1 className="text-xl font-black text-slate-900">{data?.user?.name || "Berry"}</h1>
      <div className="flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-bold text-orange-500 shadow-sm">
        <Flame size={14} /> {data?.user?.streak || 0}
      </div>
    </div>
  );
}

export function BottomNav() {
  const { screen, setScreen } = useStore();

  const tabs = [
    [SCREENS.HOME,          Home,         "Home"],
    [SCREENS.PROGRESS,      BarChart3,    "Progress"],
    [SCREENS.WATER_TRACKER, Droplets,     "Water"],
    [SCREENS.SCAN,          Plus,         ""],
    [SCREENS.MEAL_PLAN,     CalendarDays, "Planner"],
    [SCREENS.DETOX,         Leaf,         "Detox"],
    [SCREENS.PROFILE,       User,         "Profile"],
  ];

  return (
    <div className="absolute bottom-3 left-4 right-4 z-[999] flex h-[78px] items-center justify-around rounded-[30px] bg-white/95 px-2 shadow-[0_18px_45px_rgba(244,63,94,0.22)] backdrop-blur-xl">
      {tabs.map(([id, Icon, label]) =>
        id === "scan" ? (
          <button
            key={id}
            onClick={() => setScreen("scan")}
            className="-mt-10 grid h-16 w-16 shrink-0 place-items-center rounded-full bg-gradient-to-br from-rose-400 to-red-500 text-white shadow-xl shadow-rose-300/80 ring-[5px] ring-white active:scale-95"
          >
            <Plus size={26} />
          </button>
        ) : (
          <button
            key={id}
            onClick={() => setScreen(id)}
            className={`flex min-w-[42px] flex-col items-center gap-1 text-[9px] ${
              screen === id ? "text-red-500" : "text-slate-400"
            }`}
          >
            <Icon size={17} />
            <span>{label}</span>
          </button>
        )
      )}
    </div>
  );
}

export function DayStrip() {
  const selectedDate = useStore((s) => s.selectedDate);
  const setSelectedDate = useStore((s) => s.setSelectedDate);

  // Build a 7-day window: 5 days back, today, 1 day forward
  const today = new Date();
  // Helper: ISO date string "YYYY-MM-DD" for a Date object
  const toISO = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const todayISO = toISO(today);
  const activeISO = selectedDate || todayISO;

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i - 5);
    const iso = toISO(d);
    const isFuture = iso > todayISO;
    return {
      name: d.toLocaleDateString("en-US", { weekday: "short" }),
      date: d.getDate().toString().padStart(2, "0"),
      iso,
      isActive: iso === activeISO,
      isToday: iso === todayISO,
      isFuture,
    };
  });

  return (
    <div className="mt-5 flex justify-between">
      {days.map((d) => (
        <button
          key={d.iso}
          disabled={d.isFuture}
          onClick={() => setSelectedDate(d.iso === todayISO ? null : d.iso)}
          className={`flex flex-col items-center gap-1 text-[10px] transition-opacity ${
            d.isFuture ? "opacity-30 cursor-default" : "cursor-pointer"
          } ${d.isActive ? "text-slate-900" : "text-slate-400"}`}
        >
          <span className="font-bold">{d.name}</span>
          <span
            className={`grid h-8 w-8 place-items-center rounded-full transition-all font-bold ${
              d.isActive
                ? "bg-red-500 font-black text-white shadow-lg shadow-red-200 scale-110"
                : d.isToday
                ? "bg-rose-100 text-rose-500"
                : "bg-white text-slate-400"
            }`}
          >
            {d.date}
          </span>
        </button>
      ))}
    </div>
  );
}

export function SectionTitle({ title, action }) {
  return (
    <div className="mb-3 mt-6 flex items-center justify-between">
      <h3 className="font-black text-slate-900">{title}</h3>
      {action && <button className="text-xs font-bold text-red-400">{action}</button>}
    </div>
  );
}

export function MacroCard({ title, value, icon, progress }) {
  const pct = Math.min(100, Math.max(0, progress ?? 0));
  return (
    <div className="rounded-[24px] bg-white p-4 shadow-[0_12px_35px_rgba(244,63,94,0.08)] ring-1 ring-rose-50 overflow-hidden">
      <h4 className="text-xl font-black text-slate-900">{value}</h4>
      <p className="mt-1 text-[10px] text-slate-500">{title}</p>
      <div className="mx-auto mt-4 grid h-10 w-10 place-items-center rounded-full bg-rose-50 text-lg ring-4 ring-rose-100">{icon}</div>
      {progress !== undefined && (
        <div className="mt-3 h-1.5 w-full rounded-full bg-rose-50">
          <div
            className="h-1.5 rounded-full bg-gradient-to-r from-rose-400 to-red-500 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}
