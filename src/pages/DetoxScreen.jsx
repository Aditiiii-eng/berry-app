import React, { useState, useEffect, useCallback } from "react";
import {
  Leaf, CheckCircle2, Circle, BookOpen,
  Zap, ChevronDown, ChevronUp, Star, ChevronRight, Plus,
  TrendingUp, Award, Calendar, Target, Flame, Clock,
  BarChart3, Shield, Droplets, Apple, Ban, Coffee,
  PersonStanding, Moon, Activity, Trophy, CheckCheck,
  ArrowRight, Info, Lock
} from "lucide-react";
import { useStore } from "../store/useStore";
import { LoadingOverlay } from "../components/ui";
import {
  getDetoxStatus, logDetoxChecklist, saveDetoxJournal,
  getDetoxPrograms, startDetoxProgram
} from "../api/detox";
import { logHabit } from "../api/progress";
import toast from "react-hot-toast";
import { berry } from "../components/BerryUI";


// ── Default programs with enriched metadata ─────────────────────────────────
const PROGRAMS = [
  {
    id: "3day_reset",
    emoji: "🌿",
    name: "3-Day Reset",
    days: 3,
    desc: "Quick cleanse to reboot your system",
    color: "from-emerald-500 to-teal-600",
    badge: "BEGINNER",
    badgeColor: "bg-emerald-100 text-emerald-700",
    highlights: ["Eliminate processed foods", "3L water daily", "Light exercise"],
    difficulty: 1,
    popular: false,
  },
  {
    id: "7day_clean",
    emoji: "🥦",
    name: "7-Day Clean Eating",
    days: 7,
    desc: "A week of whole foods and mindfulness",
    color: "from-green-500 to-emerald-600",
    badge: "POPULAR",
    badgeColor: "bg-green-100 text-green-700",
    highlights: ["Whole foods only", "Daily journaling", "Mindful eating"],
    difficulty: 2,
    popular: true,
  },
  {
    id: "14day_wellness",
    emoji: "✨",
    name: "14-Day Wellness",
    days: 14,
    desc: "Full lifestyle reset program",
    color: "from-violet-500 to-purple-600",
    badge: "ADVANCED",
    badgeColor: "bg-violet-100 text-violet-700",
    highlights: ["Complete diet overhaul", "Sleep optimization", "Stress management"],
    difficulty: 3,
    popular: false,
  },
  {
    id: "hydration_boost",
    emoji: "💧",
    name: "Hydration Boost",
    days: 5,
    desc: "Focus on optimal water intake daily",
    color: "from-blue-500 to-cyan-600",
    badge: "EASY",
    badgeColor: "bg-blue-100 text-blue-700",
    highlights: ["4L water target", "Electrolyte balance", "Track daily intake"],
    difficulty: 1,
    popular: false,
  },
  {
    id: "sugar_detox",
    emoji: "🚫",
    name: "Sugar Detox",
    days: 7,
    desc: "Eliminate refined sugar for 7 days",
    color: "from-orange-500 to-red-500",
    badge: "MODERATE",
    badgeColor: "bg-orange-100 text-orange-700",
    highlights: ["Zero added sugar", "Read all labels", "Natural sweeteners only"],
    difficulty: 2,
    popular: false,
  },
];

// ── Daily checklist items ─────────────────────────────────────────────────
const DEFAULT_CHECKLIST = [
  { id: "water_3l",   emoji: "💧", label: "Drink 3L Water",       category: "hydration" },
  { id: "eat_fruits", emoji: "🍎", label: "Eat Fruits & Veggies", category: "nutrition" },
  { id: "no_sugar",   emoji: "🚫", label: "No Sugary Drinks",     category: "nutrition" },
  { id: "green_tea",  emoji: "🍵", label: "Drink Green Tea",      category: "wellness"  },
  { id: "walk_30",    emoji: "🚶", label: "Walk 30 Minutes",      category: "exercise"  },
  { id: "sleep_8",    emoji: "😴", label: "Sleep 8 Hours",        category: "wellness"  },
];

const MOOD_ICONS   = ["😫","😕","😐","🙂","😄"];
const ENERGY_ICONS = ["🪫","😴","⚡","🔥","💥"];

const AI_DETOX_TIPS = [
  "Great job staying hydrated! Adding lemon boosts detox and vitamin C.",
  "Green tea contains catechins that support liver detox pathways.",
  "Walking increases lymphatic flow, flushing toxins naturally.",
  "Cruciferous vegetables (broccoli, kale) support phase 2 liver detox.",
  "Adequate sleep is when your brain's glymphatic system clears waste.",
  "Reducing sugar for just 3 days significantly reduces liver fat.",
];

const DAY_LABELS = ["MON","TUE","WED","THU","FRI","SAT","SUN"];
const DAY_SHORT  = ["M","T","W","T","F","S","S"];

// Difficulty dots renderer
function DifficultyDots({ level }) {
  return (
    <div className="flex gap-0.5 items-center">
      {[1,2,3].map(d => (
        <div key={d} className={`h-1.5 w-4 rounded-full transition-all ${d <= level ? "bg-primary" : "bg-surface-container-high"}`} />
      ))}
    </div>
  );
}

// Radial progress ring
function RadialRing({ pct, emoji, size = 80 }) {
  const r = 15;
  const circ = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r={r} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="3" />
        <circle
          cx="18" cy="18" r={r} fill="none"
          stroke="white" strokeWidth="3"
          strokeDasharray={`${pct * circ / 100} ${circ}`}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-xl font-black">
        {emoji}
      </div>
    </div>
  );
}

export function DetoxScreen() {
  const { dashboard, setDashboard, setMealPlan } = useStore();

  const [loading,       setLoading]       = useState(true);
  const [checklist,     setChecklist]     = useState(DEFAULT_CHECKLIST.map(i => ({ ...i, done: false })));
  const [stats,         setStats]         = useState({ currentStreak: 0, longestStreak: 0, programsCompleted: 0, totalDays: 0 });
  const [activeProgram, setActiveProgram] = useState(null);
  const [journal,       setJournal]       = useState({ energy: 2, mood: 2, digestion: 2, notes: "" });
  const [journalSaved,  setJournalSaved]  = useState(false);
  const [tab,           setTab]           = useState("checklist");
  const [showJournal,   setShowJournal]   = useState(false);
  const [saving,        setSaving]        = useState(false);
  const [habitLogging,  setHabitLogging]  = useState(false);
  const [weekDays,      setWeekDays]      = useState([false, false, false, false, false, false, false]);
  const [expandedProg,  setExpandedProg]  = useState(null);
  const [rawChecklist,  setRawChecklist]  = useState({});

  const completedCount = checklist.filter(i => i.done).length;
  const progressPct    = Math.round((completedCount / checklist.length) * 100);
  const todayTip       = AI_DETOX_TIPS[new Date().getDay() % AI_DETOX_TIPS.length];
  const weekTotal      = weekDays.filter(Boolean).length;

  // Compute how many days into the active program we are
  const programDayNum = (() => {
    if (!activeProgram?.startedAt) return 1;
    const started = new Date(activeProgram.startedAt);
    const now = new Date();
    const diff = Math.floor((now - started) / (1000 * 60 * 60 * 24));
    return Math.min(diff + 1, activeProgram.days);
  })();

  const programPct = activeProgram ? Math.round((programDayNum / activeProgram.days) * 100) : 0;
  const isProgramDayCompleted = rawChecklist[`program_day_${activeProgram?.id}_${programDayNum}`] === true;

  const handleLogHabit = async () => {
    if (habitLogging) return;
    try {
      setHabitLogging(true);
      const result = await logHabit("detox");
      if (result.dashboard) setDashboard(result.dashboard);
      if (result.mealPlan)  setMealPlan(result.mealPlan);
      const todayIdx = (new Date().getDay() + 6) % 7;
      setWeekDays(prev => prev.map((v, i) => i === todayIdx ? true : v));
      toast.success("Detox logged! 🌿");
    } catch (e) {
      toast.error(e.message || "Failed to log habit");
    } finally {
      setHabitLogging(false);
    }
  };

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getDetoxStatus();
      if (res.checklist) {
        setRawChecklist(res.checklist);
        setChecklist(DEFAULT_CHECKLIST.map(item => ({ ...item, done: res.checklist[item.id] || false })));
      }
      if (res.stats)          setStats(res.stats);
      if (res.activeProgram)  setActiveProgram(res.activeProgram);
      if (Array.isArray(res.weekDays)) setWeekDays(res.weekDays);
      if (res.journal) {
        setJournal(j => ({ ...j, ...res.journal }));
        setJournalSaved(true);
      }
    } catch {
      // Graceful degradation
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const toggleItem = async (id) => {
    const newState = checklist.map(i => i.id === id ? { ...i, done: !i.done } : i);
    setChecklist(newState);
    try {
      await logDetoxChecklist(id, newState.find(i => i.id === id).done);
    } catch (e) {
      if (e?.status === 401) {
        setChecklist(checklist);
        toast.error("Session expired — please log in again");
      }
    }
  };

  const handleSaveJournal = async () => {
    try {
      setSaving(true);
      await saveDetoxJournal(journal);
      setJournalSaved(true);
      toast.success("Journal saved! 🌿");
      setShowJournal(false);
    } catch {
      toast.error("Could not save journal");
    } finally {
      setSaving(false);
    }
  };

  const handleStartProgram = async (programId) => {
    const program = PROGRAMS.find(p => p.id === programId);
    try {
      const res = await startDetoxProgram(programId, program);
      setActiveProgram(res.program || program);
      setTab("programs");
      toast.success(`${program.emoji} ${program.name} started! Let's go!`);
    } catch {
      setActiveProgram(program);
      setTab("programs");
      toast.success("Program started! 🌿");
    }
  };

  const handleLogProgramDay = async () => {
    if (!activeProgram) return;
    const habitId = `program_day_${activeProgram.id}_${programDayNum}`;
    const newState = !isProgramDayCompleted;
    setRawChecklist(prev => ({ ...prev, [habitId]: newState }));
    try {
      await logDetoxChecklist(habitId, newState);
      if (newState) toast.success(`Day ${programDayNum} of ${activeProgram.name} completed! 🎉`);
    } catch (e) {
      setRawChecklist(prev => ({ ...prev, [habitId]: !newState }));
      toast.error("Failed to log program day");
    }
  };

  // ── Stat card data derived from real state ────────────────────────────
  const statCards = [
    {
      icon: "🔥", label: "Current Streak",
      value: stats.currentStreak,
      unit: "days",
      sub: stats.currentStreak > 0 ? "Keep it up!" : "Start today",
      color: "bg-orange-50 border-orange-100",
      iconBg: "bg-orange-100",
    },
    {
      icon: "🏆", label: "Best Streak",
      value: stats.longestStreak,
      unit: "days",
      sub: "Personal best",
      color: "bg-yellow-50 border-yellow-100",
      iconBg: "bg-yellow-100",
    },
    {
      icon: "📅", label: "Total Days",
      value: stats.totalDays,
      unit: "logged",
      sub: "All time",
      color: "bg-blue-50 border-blue-100",
      iconBg: "bg-blue-100",
    },
    {
      icon: "✅", label: "This Week",
      value: weekTotal,
      unit: "/ 7",
      sub: "Days active",
      color: "bg-green-50 border-green-100",
      iconBg: "bg-green-100",
    },
  ];

  // Today's task completion breakdown by category
  const categoryGroups = DEFAULT_CHECKLIST.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = { total: 0, done: 0 };
    acc[item.category].total++;
    if (checklist.find(c => c.id === item.id)?.done) acc[item.category].done++;
    return acc;
  }, {});

  const categoryIcons = {
    hydration: { emoji: "💧", color: "text-blue-500",   bg: "bg-blue-50"   },
    nutrition:  { emoji: "🥗", color: "text-green-500",  bg: "bg-green-50"  },
    wellness:   { emoji: "🧘", color: "text-purple-500", bg: "bg-purple-50" },
    exercise:   { emoji: "🏃", color: "text-orange-500", bg: "bg-orange-50" },
  };

  return (
    <div className={berry.screen}>
      <LoadingOverlay loading={loading} />

      {/* ── Top App Bar ───────────────────────────────────────────── */}
      <header className={berry.header}>
        <div className="flex items-center gap-2">
          <Leaf size={20} className="text-rose-500 animate-pulse" />
          <h1 className={berry.title}>Detox</h1>
          {activeProgram && (
            <span className={berry.subtitle}>
              — Day {programDayNum}/{activeProgram.days}
            </span>
          )}
        </div>
        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white text-2xl shadow-sm ring-1 ring-slate-100">
          {activeProgram?.emoji || "✨"}
        </div>
      </header>

      <div className="mt-5 flex flex-col gap-4">

        {/* ── Hero / Progress Card ────────────────────────────────── */}
        {activeProgram ? (
          <div className="rounded-[26px] bg-gradient-to-br from-rose-400 to-red-500 p-5 text-white shadow-lg relative overflow-hidden">
            <div className="absolute -right-8 -top-8 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute -left-4 -bottom-4 w-24 h-24 bg-white/5 rounded-full blur-2xl" />
            
            <div className="flex items-start justify-between relative z-10">
              <div className="flex flex-col gap-1.5 flex-1 pr-4">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider opacity-85">Active Program</span>
                  <span className="bg-white/20 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">Day {programDayNum}</span>
                </div>
                <p className="text-[16px] font-black leading-tight">{activeProgram.name || activeProgram.id}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-glow">{progressPct}%</span>
                  <span className="text-[11px] font-bold opacity-85">completed today</span>
                </div>
                
                {/* Program progress bar */}
                <div className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden mt-1">
                  <div
                    className="h-full bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.6)] transition-all duration-700"
                    style={{ width: `${programPct}%` }}
                  />
                </div>
                <p className="text-[10px] opacity-75">{programDayNum} of {activeProgram.days} days complete</p>
              </div>
              <RadialRing pct={progressPct} emoji={activeProgram.emoji || "✨"} size={76} />
            </div>
            
            {/* Mini stats row */}
            <div className="mt-4 flex justify-around border-t border-white/20 pt-3 relative z-10">
              {[
                { v: stats.currentStreak, l: "Streak 🔥" },
                { v: stats.totalDays, l: "Total Days" },
                { v: `${completedCount}/${checklist.length}`, l: "Today" },
              ].map(({ v, l }, i) => (
                <React.Fragment key={l}>
                  {i > 0 && <div className="h-7 w-px bg-white/20" />}
                  <div className="text-center">
                    <p className="text-[15px] font-black">{v}</p>
                    <p className="text-[9px] opacity-75 uppercase tracking-wider font-black">{l}</p>
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-[26px] bg-white p-5 shadow-[0_16px_45px_rgba(244,63,94,0.08)] flex flex-col items-center text-center gap-3 ring-1 ring-rose-50/50">
            <div className="w-14 h-14 rounded-full bg-rose-50 flex items-center justify-center text-rose-500">
              <Leaf size={26} />
            </div>
            <div>
              <p className="text-[16px] font-black text-slate-900">No active program</p>
              <p className="text-[12px] font-semibold text-slate-400 mt-1">Choose a detox program to begin your journey</p>
            </div>
            <button
              onClick={() => setTab("programs")}
              className={berry.primaryButton}
            >
              Browse Programs
            </button>
          </div>
        )}

        {/* ── Segmented Tab Navigation ─────────────────────────── */}
        <nav className="flex bg-slate-100 rounded-full p-1 ring-1 ring-slate-200/50">
          {[["checklist","✓ Checklist"],["programs","Programs"],["stats","Stats"]].map(([k, label]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`flex-1 py-1.5 rounded-full text-[11px] font-black transition-all ${
                tab === k
                  ? "bg-white shadow-sm text-rose-500"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>

        {/* ═══════════════════════════════════════════════════════
            CHECKLIST TAB
        ═══════════════════════════════════════════════════════ */}
        {tab === "checklist" && (
          <div className="flex flex-col gap-3">
            {checklist.map((item) => (
              <button
                key={item.id}
                onClick={() => toggleItem(item.id)}
                className={`flex w-full items-center gap-3 rounded-[22px] p-4 text-left border transition-all active:scale-[0.98] shadow-sm ${
                  item.done
                    ? "bg-rose-50/50 border-rose-100/70"
                    : "bg-white border-slate-100"
                }`}
              >
                <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-2xl ${
                  item.done ? "bg-white" : "bg-slate-50"
                }`}>
                  {item.emoji}
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-black ${item.done ? "text-rose-500 line-through" : "text-slate-900"}`}>
                    {item.label}
                  </p>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    {item.category}
                  </span>
                </div>
                {item.done
                  ? <CheckCircle2 size={20} className="text-rose-500 shrink-0" />
                  : <Circle size={20} className="text-slate-300 shrink-0" />
                }
              </button>
            ))}

            {/* Daily Journal */}
            <div className="bg-white rounded-[22px] border border-slate-100 shadow-sm overflow-hidden">
              <button
                onClick={() => setShowJournal(!showJournal)}
                className="flex w-full items-center justify-between p-4"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center">
                    <BookOpen size={14} className="text-rose-500" />
                  </div>
                  <span className="font-black text-slate-900 text-sm">Daily Journal</span>
                  {journalSaved && (
                    <span className="text-[9px] font-black text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full uppercase tracking-wider">✓ Saved</span>
                  )}
                </div>
                {showJournal ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
              </button>

              {showJournal && (
                <div className="px-4 pb-4 space-y-4 border-t border-slate-50 pt-4">
                  {[
                    ["energy", "Energy", ENERGY_ICONS],
                    ["mood", "Mood", MOOD_ICONS],
                    ["digestion", "Digestion", ["🤢","😣","😐","😊","✨"]],
                  ].map(([key, label, icons]) => (
                    <div key={key}>
                      <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</p>
                      <div className="flex gap-2">
                        {icons.map((icon, idx) => (
                          <button
                            key={idx}
                            onClick={() => setJournal(j => ({ ...j, [key]: idx }))}
                            className={`flex-1 rounded-xl py-2 text-xl transition-all ${
                              journal[key] === idx
                                ? "bg-rose-50 border border-rose-200 scale-105 shadow-sm"
                                : "bg-slate-50 border border-slate-100 hover:bg-slate-100"
                            }`}
                          >
                            {icon}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  <div>
                    <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-slate-400">Notes</p>
                    <textarea
                      value={journal.notes}
                      onChange={(e) => setJournal(j => ({ ...j, notes: e.target.value }))}
                      placeholder="How are you feeling today?"
                      rows={3}
                      className="w-full rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-rose-300 transition-colors"
                    />
                  </div>
                  <button
                    onClick={handleSaveJournal}
                    disabled={saving}
                    className="w-full rounded-full bg-rose-500 py-2.5 text-xs font-black uppercase tracking-wide text-white shadow-md active:scale-95 transition-all disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save Journal Entry"}
                  </button>
                </div>
              )}
            </div>

            {/* AI Tip */}
            <div className="bg-rose-50/50 p-4 rounded-[22px] border border-rose-100/50 flex gap-3 items-start shadow-sm">
              <div className="bg-rose-500 p-1.5 rounded-lg text-white shadow-sm shrink-0">
                <Zap size={14} />
              </div>
              <div className="flex flex-col gap-1">
                <h3 className="font-black text-[10px] text-rose-500 uppercase tracking-wider">AI Detox Tip</h3>
                <p className="text-xs font-semibold text-slate-600 leading-snug">{todayTip}</p>
              </div>
            </div>

            {/* Detox Habit Tracker */}
            <div className="bg-white rounded-[22px] border border-slate-100 shadow-sm p-4">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-rose-50 text-2xl border border-rose-100/40">🌿</div>
                <div className="flex-1">
                  <h4 className="font-black text-slate-900 text-sm">Daily Detox</h4>
                  <p className="text-[11px] font-semibold text-slate-400 mt-0.5">Green tea &amp; No sugar</p>
                </div>
                <div className="rounded-full bg-slate-50 px-3 py-1 text-[11px] font-black text-slate-500 border border-slate-100">
                  🔥 {stats.currentStreak > 0 ? `${stats.currentStreak} Day` : "Start!"}
                </div>
              </div>

              <button
                onClick={handleLogHabit}
                disabled={habitLogging}
                className="mt-4 w-full rounded-full bg-rose-500 py-2.5 text-xs font-black uppercase tracking-wide text-white shadow-md active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-1"
              >
                <Plus size={14} />
                {habitLogging ? "Logging..." : "Log Daily Detox"}
              </button>

              <div className="mt-4 flex justify-between">
                {DAY_LABELS.map((d, i) => (
                  <div key={d} className="text-center">
                    <p className="mb-1.5 text-[8px] font-black text-slate-400 uppercase tracking-wider">{d}</p>
                    <span className={`grid h-8 w-8 place-items-center rounded-full text-xs transition-all ${
                      weekDays[i]
                        ? "bg-rose-500 text-white shadow-md shadow-rose-200"
                        : "border border-dashed border-slate-200 text-slate-300"
                    }`}>✓</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════
            PROGRAMS TAB
        ═══════════════════════════════════════════════════════ */}
        {tab === "programs" && (
          <div className="flex flex-col gap-3">

            {/* Active program banner */}
            {activeProgram && (
              <div className="rounded-[26px] bg-gradient-to-br from-rose-400 to-red-500 p-5 text-white shadow-lg relative overflow-hidden flex flex-col gap-3">
                <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/10 rounded-full blur-2xl" />
                <div className="flex items-center gap-3">
                  <div className="text-3xl">{activeProgram.emoji || "✨"}</div>
                  <div className="flex-1">
                    <p className="font-black text-sm text-white">
                      {activeProgram.name || activeProgram.id}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="h-1.5 flex-1 bg-white/20 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-white rounded-full transition-all duration-700"
                          style={{ width: `${programPct}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-white opacity-85 shrink-0">Day {programDayNum}/{activeProgram.days}</span>
                    </div>
                  </div>
                  <span className="text-[9px] font-black text-white bg-white/20 px-2 py-1 rounded-full uppercase tracking-wider shrink-0">ACTIVE</span>
                </div>
                <button
                  onClick={handleLogProgramDay}
                  className={`w-full py-2.5 rounded-full text-xs font-black uppercase tracking-wide flex items-center justify-center gap-1.5 transition-all shadow-md ${
                    isProgramDayCompleted
                      ? "bg-white/20 text-white border border-white/30"
                      : "bg-white text-rose-500"
                  }`}
                >
                  {isProgramDayCompleted ? (
                    <>
                      <CheckCheck size={14} /> Day {programDayNum} Completed
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={14} /> Log Day {programDayNum} Complete
                    </>
                  )}
                </button>
              </div>
            )}

            <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 mt-1">
              {activeProgram ? "Switch Program" : "Choose a Program"}
            </p>

            {PROGRAMS.map((p) => {
              const isActive    = activeProgram?.id === p.id;
              const isExpanded  = expandedProg === p.id;
              return (
                <div
                  key={p.id}
                  className={`rounded-[22px] border transition-all shadow-sm overflow-hidden ${
                    isActive
                      ? "border-rose-200 bg-rose-50/20"
                      : "border-slate-100 bg-white"
                  }`}
                >
                  {/* Card header */}
                  <div className="flex items-start gap-3 p-4">
                    {/* Emoji badge */}
                    <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl text-2xl border ${
                      isActive ? "bg-rose-50 border-rose-100/50" : "bg-slate-50 border-slate-100"
                    }`}>
                      {p.emoji}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-black text-slate-900">{p.name}</p>
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${p.badgeColor}`}>
                          {p.badge}
                        </span>
                        {p.popular && (
                          <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-amber-50 text-amber-500 uppercase tracking-wider">⭐ Top Pick</span>
                        )}
                      </div>
                      <p className="mt-1 text-[11px] font-semibold text-slate-400">{p.desc}</p>
                      <div className="mt-2.5 flex items-center gap-3">
                        <div className="flex items-center gap-1 text-slate-400">
                          <Clock size={11} />
                          <span className="text-[10px] font-bold">{p.days} days</span>
                        </div>
                        <DifficultyDots level={p.difficulty} />
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                          {p.difficulty === 1 ? "Easy" : p.difficulty === 2 ? "Moderate" : "Advanced"}
                        </span>
                      </div>
                    </div>

                    {/* Expand / active indicator */}
                    <button
                      onClick={() => setExpandedProg(isExpanded ? null : p.id)}
                      className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-slate-50 text-slate-400"
                    >
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-slate-50">
                      <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 mt-3 mb-2">What you'll do</p>
                      <div className="flex flex-col gap-1.5 mb-4">
                        {p.highlights.map((h, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                            <span className="text-xs font-semibold text-slate-700">{h}</span>
                          </div>
                        ))}
                      </div>

                      <button
                        onClick={() => handleStartProgram(p.id)}
                        disabled={isActive}
                        className={`w-full rounded-full py-2.5 text-xs font-black uppercase tracking-wide transition-all active:scale-95 flex items-center justify-center gap-1 ${
                          isActive
                            ? "bg-rose-50 text-rose-500 border border-rose-100"
                            : "bg-rose-500 text-white shadow-md shadow-rose-200"
                        }`}
                      >
                        {isActive ? (
                          <>
                            <CheckCheck size={14} /> Currently Active
                          </>
                        ) : (
                          <>
                            <Flame size={14} /> Start Program
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Quick-start button when collapsed & not active */}
                  {!isExpanded && !isActive && (
                    <div className="px-4 pb-4 pt-0">
                      <button
                        onClick={() => handleStartProgram(p.id)}
                        className="w-full rounded-full border border-rose-100 bg-rose-50/20 py-2 text-[10px] font-black uppercase tracking-wide text-rose-500 transition-all hover:bg-rose-50/40 active:scale-95 flex items-center justify-center gap-1"
                      >
                        Start <ArrowRight size={11} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════
            STATS TAB
        ═══════════════════════════════════════════════════════ */}
        {tab === "stats" && (
          <div className="flex flex-col gap-3">

            {/* 2×2 Key Stats Cards */}
            <div className="grid grid-cols-2 gap-3">
              {statCards.map(({ icon, label, value, unit, sub, color, iconBg }) => {
                const tones = {
                  "bg-orange-50 border-orange-100": "bg-orange-50/30 border-orange-100/50",
                  "bg-yellow-50 border-yellow-100": "bg-amber-50/30 border-amber-100/50",
                  "bg-blue-50 border-blue-100": "bg-blue-50/30 border-blue-100/50",
                  "bg-green-50 border-green-100": "bg-emerald-50/30 border-emerald-100/50",
                };
                const bgIcon = {
                  "bg-orange-100": "bg-orange-100/60",
                  "bg-yellow-100": "bg-amber-100/60",
                  "bg-blue-100": "bg-blue-100/60",
                  "bg-green-100": "bg-emerald-100/60",
                };
                return (
                  <div key={label} className={`rounded-[24px] p-4 border ${tones[color] || 'border-slate-100 bg-white'} shadow-sm transition-all hover:scale-[1.01]`}>
                    <div className={`w-9 h-9 rounded-xl ${bgIcon[iconBg] || "bg-slate-50"} flex items-center justify-center text-xl mb-3 shadow-xs`}>
                      {icon}
                    </div>
                    <div className="flex items-baseline gap-0.5">
                      <span className="text-2xl font-black text-slate-900">{value}</span>
                      <span className="text-[10px] text-slate-500 font-bold">{unit}</span>
                    </div>
                    <p className="text-[10px] font-black text-slate-800 uppercase tracking-wider mt-1">{label}</p>
                    <p className="text-[9px] font-semibold text-slate-400 mt-0.5">{sub}</p>
                  </div>
                );
              })}
            </div>

            {/* Active Program Progress Card */}
            {activeProgram && (
              <div className="rounded-[26px] bg-gradient-to-br from-rose-400 to-red-500 p-5 text-white shadow-lg relative overflow-hidden">
                <div className="absolute -right-6 -top-6 w-28 h-28 bg-white/10 rounded-full blur-3xl" />
                <p className="text-[9px] font-black uppercase tracking-wider opacity-85 mb-2">Program Progress</p>
                <div className="flex items-center justify-between gap-3 relative z-10">
                  <div className="flex-1">
                    <p className="text-sm font-black text-white">{activeProgram.name || activeProgram.id}</p>
                    <p className="text-xs opacity-85 mt-0.5">Day {programDayNum} of {activeProgram.days}</p>
                    <div className="mt-3 h-1.5 bg-white/20 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.5)] transition-all duration-700"
                        style={{ width: `${programPct}%` }}
                      />
                    </div>
                    <p className="text-[10px] opacity-75 mt-1">{programPct}% complete</p>
                  </div>
                  <div className="text-3xl bg-white/10 w-12 h-12 rounded-full flex items-center justify-center shrink-0">{activeProgram.emoji || "✨"}</div>
                </div>
              </div>
            )}

            {/* Weekly Activity Heatmap */}
            <div className="bg-white rounded-[22px] p-4 border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-black text-slate-900">This Week</h3>
                  <p className="text-[10px] font-semibold text-slate-400 mt-0.5">{weekTotal} of 7 days active</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.3)]" />
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Done</span>
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-100 ml-2" />
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Pending</span>
                </div>
              </div>
              <div className="flex gap-1.5">
                {DAY_SHORT.map((d, i) => {
                  const isToday = i === (new Date().getDay() + 6) % 7;
                  const isDone  = weekDays[i] === true;
                  return (
                    <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                      <div className={`h-11 w-full rounded-xl transition-all relative ${
                        isDone ? "bg-rose-500 shadow-sm" : "bg-slate-50"
                      }`}>
                        {isDone && (
                          <div className="absolute inset-0 flex items-center justify-center text-white text-xs font-black">✓</div>
                        )}
                        {isToday && !isDone && (
                          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-rose-500 animate-ping" />
                        )}
                      </div>
                      <p className={`text-[9px] font-black ${isToday ? "text-rose-500" : "text-slate-400"}`}>{d}</p>
                    </div>
                  );
                })}
              </div>
              {/* Week completion bar */}
              <div className="mt-4 pt-3 border-t border-slate-50">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Week Completion</span>
                  <span className="text-[10px] font-black text-rose-500">{Math.round(weekTotal / 7 * 100)}%</span>
                </div>
                <div className="h-1.5 bg-slate-50 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-rose-500 rounded-full transition-all duration-700"
                    style={{ width: `${Math.round(weekTotal / 7 * 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Today's Task Breakdown by Category */}
            <div className="bg-white rounded-[22px] p-4 border border-slate-100 shadow-sm">
              <h3 className="text-sm font-black text-slate-900 mb-0.5">Today's Breakdown</h3>
              <p className="text-[10px] font-semibold text-slate-400 mb-4">{completedCount} of {checklist.length} tasks completed</p>
              <div className="flex flex-col gap-3">
                {Object.entries(categoryGroups).map(([cat, { total, done }]) => {
                  const meta = categoryIcons[cat] || { emoji: "📋", color: "text-slate-500", bg: "bg-slate-50" };
                  const pct  = Math.round((done / total) * 100);
                  return (
                    <div key={cat} className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg ${meta.bg} flex items-center justify-center text-base shrink-0`}>
                        {meta.emoji}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between mb-1">
                          <span className="text-[11px] font-black text-slate-700 capitalize">{cat}</span>
                          <span className={`text-[11px] font-black text-rose-500`}>{done}/{total}</span>
                        </div>
                        <div className="h-1 bg-slate-50 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 bg-rose-500`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Streak History Visual */}
            <div className="bg-white rounded-[22px] p-4 border border-slate-100 shadow-sm">
              <h3 className="text-sm font-black text-slate-900 mb-0.5">Streak Overview</h3>
              <p className="text-[10px] font-semibold text-slate-400 mb-4">Your all-time detox performance</p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { icon: "🔥", label: "Current",  value: stats.currentStreak },
                  { icon: "🏆", label: "Best Ever", value: stats.longestStreak },
                  { icon: "📅", label: "Total",     value: stats.totalDays },
                ].map(({ icon, label, value }) => (
                  <div key={label} className="text-center p-2.5 bg-slate-50 rounded-xl border border-slate-100/50">
                    <div className="text-2xl mb-1">{icon}</div>
                    <p className="text-lg font-black text-slate-900">{value}</p>
                    <p className="text-[8px] text-slate-400 uppercase tracking-wider font-black">{label}</p>
                  </div>
                ))}
              </div>

              {/* Streak motivation */}
              {stats.currentStreak > 0 ? (
                <div className="mt-4 p-3 bg-rose-50/50 border border-rose-100/50 rounded-xl">
                  <p className="text-xs font-black text-rose-500">🎉 {stats.currentStreak}-day streak!</p>
                  <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Keep going — consistency builds lasting habits!</p>
                </div>
              ) : (
                <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-xs font-black text-slate-700">🌱 Start your streak today</p>
                  <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Log your first detox habit to begin building your streak.</p>
                </div>
              )}
            </div>

            {/* AI Insights */}
            <div className="bg-rose-50/50 p-4 rounded-[22px] border border-rose-100/50 mb-4">
              <div className="flex items-center gap-1.5 mb-2">
                <div className="bg-rose-500 p-1.5 rounded-lg text-white shadow-sm">
                  <Star size={12} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider text-rose-500">AI Insights</span>
              </div>
              <div className="flex flex-col gap-1.5">
                {[
                  `You've completed ${completedCount} of ${checklist.length} tasks today — ${progressPct}% done!`,
                  stats.currentStreak > 0
                    ? `Amazing! You're on a ${stats.currentStreak}-day detox streak. ${stats.currentStreak >= 7 ? "That's a full week! 🏆" : `${7 - stats.currentStreak} more days for a full week!`}`
                    : "Start your streak today — even one small habit creates momentum!",
                  weekTotal >= 5
                    ? `Outstanding week! ${weekTotal}/7 days active — you're crushing it! 🌟`
                    : `${weekTotal}/7 days active this week. You can do more!`,
                  todayTip,
                ].map((tip, i) => (
                  <p key={i} className="text-[12px] font-semibold text-slate-600 leading-snug flex gap-2">
                    <span className="text-rose-400 shrink-0">•</span>
                    {tip}
                  </p>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
