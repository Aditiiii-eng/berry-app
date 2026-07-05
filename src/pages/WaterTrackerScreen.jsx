import React, { useState, useEffect, useCallback } from "react";
import { useStore, SCREENS } from "../store/useStore";
import { LoadingOverlay } from "../components/ui";
import { getWaterHistory, logWater, getWaterWeekly, deleteWaterLog } from "../api/progress";
import { getUserGoals, updateGoals } from "../api/profile";
import toast from "react-hot-toast";
import { berry } from "../components/BerryUI";
import { 
  Droplets, Flame, Trophy, Plus, X, 
  CalendarDays, Bell, Sparkles, ChevronRight, Zap, Edit2, Check, Trash2
} from "lucide-react";

const ACHIEVEMENTS = [
  { id: "first_drop", emoji: "💧", label: "First Drop", desc: "Log your first glass", target: 1 },
  { id: "hydrated_5",  emoji: "🌊", label: "Hydration Hero", desc: "Hit goal 5 days",    target: 5  },
  { id: "streak_7",   emoji: "🏆", label: "Week Warrior",   desc: "7-day streak",       target: 7  },
  { id: "litre_3",    emoji: "⚡", label: "3L Club",        desc: "Drink 3L in one day", target: 3000 },
];

const AI_TIPS = [
  "Drinking water before a meal can improve your digestion and metabolic rate by up to 30%.",
  "Your body is 60% water — staying hydrated boosts focus and energy.",
  "Try adding lemon or mint for variety — it also aids digestion.",
  "Hydration accelerates metabolism by up to 30% for 90 minutes.",
  "Morning water on an empty stomach jumpstarts your digestive system.",
  "After workouts, drink 500ml within 30 minutes for faster recovery.",
];

export function WaterTrackerScreen() {
  const { dashboard, setDashboard, setMealPlan } = useStore();

  const [history, setHistory]     = useState([]);
  const [weekly,  setWeekly]      = useState([0,0,0,0,0,0,0]);
  const [streak,  setStreak]      = useState(0);
  const [loading, setLoading]     = useState(true);
  const [logging, setLogging]     = useState(false);
  const [custom,  setCustom]      = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [tab, setTab]             = useState("today"); // today | weekly | achievements
  const [unit, setUnit]           = useState("ml"); // ml | glass
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [editGoalValue, setEditGoalValue] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const waterData  = dashboard?.slide3?.water || { currentMl: 0, goalMl: 2500 };
  const currentMl  = waterData.currentMl || 0;
  const goalMl     = waterData.goalMl    || 2500;
  const pct        = Math.min(100, Math.round((currentMl / goalMl) * 100));
  const remaining  = Math.max(0, goalMl - currentMl);

  const todayTip = AI_TIPS[new Date().getDay() % AI_TIPS.length];

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [histRes, weekRes] = await Promise.allSettled([
        getWaterHistory(),
        getWaterWeekly().catch(() => null),
      ]);

      if (histRes.status === "fulfilled" && histRes.value?.logs) {
        setHistory(
          histRes.value.logs.map((l) => ({
            id: l.id,
            time: new Date(l.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            amount: l.amount_ml,
          }))
        );
      }
      if (weekRes.status === "fulfilled" && weekRes.value) {
        const days = weekRes.value.days || [];
        setWeekly(days.map((d) => d.total_ml || 0));
        setStreak(weekRes.value.streak || 0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleAdd = async (ml) => {
    if (logging) return;
    if (window.navigator.vibrate) window.navigator.vibrate(10);
    
    try {
      setLogging(true);
      const res = await logWater(ml);
      if (res.dashboard) setDashboard(res.dashboard);
      if (res.mealPlan)  setMealPlan(res.mealPlan);
      toast.success(`+${ml}ml logged! 💧`);
      await fetchAll();
    } catch (e) {
      toast.error("Failed to log water: " + e.message);
    } finally {
      setLogging(false);
    }
  };

  const handleCustomAdd = async () => {
    if (showCustom) {
      const ml = parseInt(custom);
      if (!ml || ml < 50 || ml > 5000) {
        toast.error("Enter a value between 50 and 5000 ml");
        return;
      }
      setShowCustom(false);
      setCustom("");
      await handleAdd(ml);
    } else {
      setShowCustom(true);
    }
  };

  const handleDeleteLog = async (logId) => {
    try {
      setLoading(true);
      const res = await deleteWaterLog(logId);
      if (res.dashboard) setDashboard(res.dashboard);
      if (res.mealPlan) setMealPlan(res.mealPlan);
      toast.success("Log deleted");
      await fetchAll();
    } catch (e) {
      toast.error("Failed to delete log: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGoal = async () => {
    const newGoal = parseInt(editGoalValue, 10);
    if (isNaN(newGoal) || newGoal < 500 || newGoal > 10000) {
      toast.error("Please enter a valid amount between 500ml and 10000ml");
      return;
    }
    
    try {
      setLoading(true);
      const currentGoals = await getUserGoals();
      const updatedGoals = { ...currentGoals, water_ml: newGoal };
      await updateGoals(updatedGoals);
      
      // Update local dashboard state
      if (dashboard) {
        setDashboard({
          ...dashboard,
          slide3: {
            ...dashboard.slide3,
            water: {
              ...dashboard.slide3.water,
              goalMl: newGoal,
            }
          }
        });
      }
      setIsEditingGoal(false);
      toast.success("Water goal updated!");
    } catch (e) {
      toast.error("Failed to update goal: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const maxWeek  = Math.max(...weekly, goalMl);

  return (
    <div className={berry.screen}>
      <LoadingOverlay loading={loading} />

      {/* Top App Bar */}
      <header className={berry.header}>
        <div className="flex items-center gap-2">
          <Droplets size={22} className="text-rose-500 animate-pulse" />
          <h1 className={berry.title}>Water Tracker</h1>
        </div>
        <div className="flex gap-2">
          <button className="grid h-10 w-10 place-items-center rounded-full bg-white text-slate-500 shadow-sm ring-1 ring-slate-100/50">
            <Bell size={17} />
          </button>
        </div>
      </header>

      <div className="mt-5 flex flex-col gap-4">
        
        {/* Hero Metrics Card */}
        <div className="rounded-[26px] bg-gradient-to-br from-rose-400 to-red-500 p-5 text-white shadow-lg relative">
          <div className="absolute inset-0 overflow-hidden rounded-[26px] pointer-events-none">
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
          </div>
          <div className="flex flex-col gap-3 relative z-10">
            <span className="text-[10px] font-black uppercase tracking-wider opacity-85">Daily Hydration</span>
            
            <div className="flex items-center gap-2 h-12">
              {isEditingGoal ? (
                <div className="flex items-center gap-2 bg-black/10 p-1.5 rounded-full backdrop-blur-sm border border-white/20 relative z-50">
                  <div className="relative">
                    <button 
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="bg-transparent text-white font-black text-xl outline-none pl-3 pr-1 cursor-pointer min-w-[3rem] text-left hover:text-white/80 transition-colors flex items-center gap-1"
                    >
                      {(parseInt(editGoalValue) / 1000).toFixed(1)}
                      <ChevronRight size={14} className={`transition-transform ${isDropdownOpen ? "rotate-90" : ""}`} />
                    </button>
                    {isDropdownOpen && (
                      <div className="absolute top-full left-0 mt-3 bg-white/95 backdrop-blur-md rounded-[20px] p-2 shadow-2xl border border-white flex flex-col gap-1 w-28 max-h-56 overflow-y-auto scrollbar-hide">
                        {[1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000].map(val => (
                          <button
                            key={val}
                            onClick={() => {
                              setEditGoalValue(val.toString());
                              setIsDropdownOpen(false);
                            }}
                            className={`px-3 py-2.5 rounded-2xl text-sm font-black text-left transition-colors ${
                              parseInt(editGoalValue) === val 
                                ? "bg-rose-500 text-white shadow-md shadow-rose-200" 
                                : "text-slate-600 hover:bg-rose-50 hover:text-rose-600"
                            }`}
                          >
                            {(val / 1000).toFixed(1)} L
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="text-white opacity-85 font-bold text-sm mr-1">L</span>
                  <button 
                    className="grid h-7 w-7 place-items-center rounded-full bg-white text-rose-500 hover:bg-rose-50 transition-colors shadow-sm ml-1"
                    onClick={() => {
                      setIsDropdownOpen(false);
                      handleSaveGoal();
                    }}
                  >
                    <Check size={14} />
                  </button>
                  <button 
                    className="grid h-7 w-7 place-items-center rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
                    onClick={() => {
                      setIsDropdownOpen(false);
                      setIsEditingGoal(false);
                    }}
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-glow">{(currentMl / 1000).toFixed(1)}</span>
                    <span className="text-[18px] font-bold opacity-85">/ {(goalMl / 1000).toFixed(1)} L</span>
                  </div>
                  <button 
                    className="grid h-7 w-7 place-items-center rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white mt-1.5"
                    onClick={() => {
                      setEditGoalValue(goalMl.toString());
                      setIsEditingGoal(true);
                    }}
                  >
                    <Edit2 size={13} />
                  </button>
                </>
              )}
            </div>
            
            <div className="space-y-2 mt-1">
              <div className="h-2 w-full bg-white/20 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.6)] transition-all duration-1000"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[11px] font-black opacity-85">
                <span>{pct}% of goal</span>
                <span className="flex items-center gap-1"><Sparkles size={12} /> Stay hydrated</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white p-4 rounded-[22px] border border-slate-100 flex flex-col items-center justify-center text-center shadow-sm">
            <span className="text-xl font-black text-slate-900">{(currentMl / 250).toFixed(0)}</span>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider mt-1">Glasses</span>
          </div>
          
          <div className="bg-white p-4 rounded-[22px] border border-slate-100 flex flex-col items-center justify-center text-center shadow-sm">
            <div className="flex items-center gap-1 justify-center">
              <Flame size={15} className="text-orange-500" />
              <span className="text-xl font-black text-slate-900">{streak}</span>
            </div>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider mt-1">Streak</span>
          </div>
          
          <div className="bg-white p-4 rounded-[22px] border border-slate-100 flex flex-col items-center justify-center text-center shadow-sm">
            <span className="text-xl font-black text-rose-500">{Math.ceil(remaining / 250)}</span>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider mt-1">Left</span>
          </div>
        </div>

        {/* Segmented Tab Navigation */}
        <nav className="flex bg-slate-100 rounded-full p-1 ring-1 ring-slate-200/50">
          {["today", "weekly"].map((t) => (
            <button 
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-1.5 rounded-full transition-all text-[11px] font-black ${
                tab === t 
                  ? "bg-white shadow-sm text-rose-500" 
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </nav>

        {/* TODAY TAB */}
        {tab === "today" && (
          <div className="flex flex-col gap-4">
            
            {/* Quick Add Section */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center mb-1">
                <h2 className="text-[9px] font-black uppercase tracking-wider text-slate-400">Quick Log</h2>
                
                <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200/50">
                  <button 
                    onClick={() => setUnit("ml")}
                    className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider transition-all ${unit === "ml" ? "bg-white shadow-sm text-rose-500" : "text-slate-400 hover:text-slate-600"}`}
                  >ml</button>
                  <button 
                    onClick={() => setUnit("glass")}
                    className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider transition-all ${unit === "glass" ? "bg-white shadow-sm text-rose-500" : "text-slate-400 hover:text-slate-600"}`}
                  >glass</button>
                </div>
              </div>

              {showCustom && (
                <div className="mb-2 flex gap-3">
                  <input
                    type="number"
                    value={custom}
                    onChange={(e) => setCustom(e.target.value)}
                    placeholder="Enter ml..."
                    className="flex-1 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-800 outline-none focus:border-rose-300 transition-colors"
                  />
                  <button
                    onClick={handleCustomAdd}
                    className="rounded-full bg-rose-500 px-6 py-3 text-xs font-black uppercase text-white shadow-md active:scale-95 transition-all"
                  >
                    Add
                  </button>
                </div>
              )}

              <div className="grid grid-cols-4 gap-3 items-stretch">
                <button 
                  disabled={logging}
                  onClick={() => handleAdd(250)}
                  className="bg-white border border-slate-100 rounded-[22px] py-4 flex flex-col items-center gap-1.5 active:scale-95 transition-all shadow-sm disabled:opacity-50"
                >
                  <span className="text-xl">💧</span>
                  <span className="text-xs font-black text-slate-700">{unit === "glass" ? "1x" : "250ml"}</span>
                </button>
                
                <button 
                  disabled={logging}
                  onClick={() => handleAdd(500)}
                  className="bg-white border border-slate-100 rounded-[22px] py-4 flex flex-col items-center gap-1.5 active:scale-95 transition-all shadow-sm disabled:opacity-50"
                >
                  <span className="text-xl">🥛</span>
                  <span className="text-xs font-black text-slate-700">{unit === "glass" ? "2x" : "500ml"}</span>
                </button>
                
                <button 
                  disabled={logging}
                  onClick={() => handleAdd(750)}
                  className="bg-white border border-slate-100 rounded-[22px] py-4 flex flex-col items-center gap-1.5 active:scale-95 transition-all shadow-sm disabled:opacity-50"
                >
                  <span className="text-xl">🌊</span>
                  <span className="text-xs font-black text-slate-700">{unit === "glass" ? "3x" : "750ml"}</span>
                </button>
                
                <button 
                  onClick={() => setShowCustom(!showCustom)}
                  className="bg-rose-500 text-white rounded-[22px] py-4 flex flex-col items-center justify-center gap-1 active:scale-95 transition-all shadow-md h-full"
                >
                  <span className="text-lg font-bold">{showCustom ? <X size={16} /> : <Plus size={16} />}</span>
                  <span className="text-xs font-black uppercase tracking-wider">{showCustom ? "Cancel" : "Custom"}</span>
                </button>
              </div>
            </div>

            {/* Recent Logs */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center mb-1">
                <h2 className="text-[9px] font-black uppercase tracking-wider text-slate-400">Recent Logs</h2>
              </div>
              
              <div className="space-y-3">
                {history.length === 0 && !loading ? (
                  <div className="bg-white p-5 rounded-[22px] text-center shadow-sm border border-slate-100">
                    <p className="text-xs font-semibold text-slate-400">No logs yet today. Stay hydrated!</p>
                  </div>
                ) : (
                  [...history].reverse().slice(0, 4).map((log) => (
                    <div key={log.id} className="bg-white p-3.5 rounded-[22px] flex items-center justify-between shadow-sm border border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center text-xl shrink-0">
                          💧
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-900">Logged Water</p>
                          <p className="text-[10px] font-semibold text-slate-400">{log.time}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-rose-500 font-black text-sm mr-1">+{log.amount}ml</span>
                        <button
                          onClick={() => handleDeleteLog(log.id)}
                          className="grid h-7 w-7 place-items-center rounded-full bg-rose-50 text-rose-400 hover:bg-rose-500 hover:text-white transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* AI Hydration Tip */}
            <div className="bg-rose-50/50 p-4 rounded-[22px] border border-rose-100/50 flex gap-3 items-start shadow-sm mb-2">
              <div className="bg-rose-500 p-1.5 rounded-lg text-white shadow-md shrink-0">
                <Zap size={14} />
              </div>
              <div className="flex flex-col gap-1">
                <h3 className="font-black text-[10px] text-rose-500 uppercase tracking-wider">AI Hydration Tip</h3>
                <p className="text-xs font-semibold text-slate-600 leading-snug">{todayTip}</p>
              </div>
            </div>
          </div>
        )}

        {/* WEEKLY TAB */}
        {tab === "weekly" && (
          <div className="flex flex-col gap-3">
            <div className="bg-white p-5 rounded-[22px] shadow-sm border border-slate-100">
              <h3 className="mb-4 text-[9px] font-black text-slate-400 uppercase tracking-wider">7-Day Overview</h3>
              
              <div className="flex items-end justify-between gap-2 h-28 pt-2">
                {weekly.map((ml, i) => {
                  const barPct = maxWeek > 0 ? (ml / maxWeek) * 100 : 0;
                  const hitGoal = ml >= goalMl;
                  return (
                    <div key={i} className="flex flex-1 flex-col items-center gap-1.5 h-full justify-end">
                      <div className="w-full rounded-t-full flex-1 flex items-end">
                        <div
                          className={`w-full rounded-md transition-all duration-700 ${hitGoal ? "bg-rose-500" : "bg-rose-200"}`}
                          style={{ height: `${Math.max(4, barPct)}%` }}
                        />
                      </div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mt-1">{weekDays[i]}</p>
                      <p className="text-[8px] font-black text-slate-900">{ml > 0 ? `${(ml/1000).toFixed(1)}L` : "-"}</p>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-50 flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Goal reached</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-rose-200" />
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Below goal</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white p-4 rounded-[22px] shadow-sm border border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Weekly Avg</p>
                <h4 className="mt-1.5 text-xl font-black text-slate-900">
                  {weekly.length ? `${((weekly.reduce((a, b) => a + b, 0) / weekly.filter(v => v > 0).length || 0) / 1000).toFixed(1)}L` : "—"}
                </h4>
                <p className="text-[9px] font-semibold text-slate-400 mt-0.5">per active day</p>
              </div>
              
              <div className="bg-white p-4 rounded-[22px] shadow-sm border border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Goal Days</p>
                <h4 className="mt-1.5 text-xl font-black text-slate-900">
                  {weekly.filter(ml => ml >= goalMl).length} / 7
                </h4>
                <p className="text-[9px] font-semibold text-slate-400 mt-0.5">days hit goal</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
