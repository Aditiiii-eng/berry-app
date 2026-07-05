import React, { useState, useEffect, useCallback } from "react";
import { Flame, ChevronRight, RefreshCcw, Trash2, Footprints, Zap, Plus, Heart } from "lucide-react";
import { useStore, SCREENS } from "../store/useStore";
import { useApi } from "../hooks/useApi";
import { getDashboard } from "../api/dashboard";
import { getProgress, logWater, logSteps, getStepsToday } from "../api/progress";
import { deleteMeal, getMeal } from "../api/meals";
import { LoadingOverlay, Header, DayStrip, SectionTitle, MacroCard } from "../components/ui";
import { ProtectedImage } from "../components/ProtectedImage";
import toast from 'react-hot-toast';

const fallbackDashboard = {
  user: { name: "Berry", streak: 0 },
  slide1: {
    caloriesLeft: 2200,
    caloriesConsumed: 0,
    caloriesGoal: 2200,
    macros: { proteinLeft: 150, carbsLeft: 250, fatsLeft: 70 },
    intake: { protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 },
    recentMeals: [],
  },
  slide2: {
    micronutrients: {
      fiberLeft: 25, fiberConsumed: 0,
      sugarLeft: 39, sugarConsumed: 0,
      sodiumLeft: 2.3, sodiumConsumed: 0,
    },
    healthScore: 7,
    healthMessage: "Log your first meal to see your health score.",
    recentMeals: [],
  },
  slide3: {
    water: { currentMl: 0, goalMl: 2500 },
    detoxHabit: {
      id: "detox",
      title: "Daily Detox",
      completedDays: [false, false, false, false, false, false, false],
    },
  },
};

const fallbackProgress = {
  stepsToday: 0,
  caloriesBurned: 0,
  water: { currentMl: 0, goalMl: 2500 },
  detoxHabit: {
    id: "detox",
    title: "Daily Detox",
    completedDays: [false, false, false, false, false, false, false],
  },
};

// ─── Sub-cards ────────────────────────────────────────────────────────────────

// Goal constants — overridden by onboarding userGoals from store
const DEFAULT_GOALS = { calories: 2200, protein: 150, carbs: 250, fats: 70, fiber: 25, sugar: 39, sodium: 2.3 };

function HomeCaloriesCard({ data, setScreen }) {
  const s1 = data?.slide1 || fallbackDashboard.slide1;
  const { setDashboard, setMealPlan, setAnalysis, userGoals } = useStore();
  const GOALS = userGoals ? { ...DEFAULT_GOALS, ...userGoals, fats: userGoals.fat ?? DEFAULT_GOALS.fats } : DEFAULT_GOALS;
  const [deleting, setDeleting] = useState(null);
  const [loadingMeal, setLoadingMeal] = useState(false);

  async function handleViewDetails(mealId) {
    if (loadingMeal) return;
    setLoadingMeal(true);
    try {
      const meal = await getMeal(mealId);
      setAnalysis(meal);
      setScreen("analysis");
    } catch (err) {
      toast.error(err.message || "Failed to load meal details");
    } finally {
      setLoadingMeal(false);
    }
  }

  // Consumed values (directly from backend intake)
  const proteinConsumed = s1.intake?.protein ?? 0;
  const carbsConsumed   = s1.intake?.carbs ?? 0;
  const fatsConsumed    = s1.intake?.fat ?? 0;

  // Left values (calculated on frontend against personal userGoals)
  const calGoal = GOALS.calories;
  const calConsumed = s1.caloriesConsumed ?? 0;
  const calLeft = Math.max(0, calGoal - calConsumed);
  const calPct = Math.min(100, Math.round((calConsumed / calGoal) * 100));

  const proteinLeft = Math.max(0, GOALS.protein - proteinConsumed);
  const carbsLeft   = Math.max(0, GOALS.carbs - carbsConsumed);
  const fatsLeft    = Math.max(0, GOALS.fats - fatsConsumed);

  // Progress bar percentages
  const proteinPct = Math.round((proteinConsumed / GOALS.protein) * 100);
  const carbsPct   = Math.round((carbsConsumed   / GOALS.carbs)   * 100);
  const fatsPct    = Math.round((fatsConsumed     / GOALS.fats)    * 100);

  async function handleDelete(e, mealId) {
    e.stopPropagation();
    setDeleting(mealId);
    try {
      const result = await deleteMeal(mealId);
      if (result.dashboard) setDashboard(result.dashboard);
      if (result.mealPlan) setMealPlan(result.mealPlan);
    } catch (err) {
      toast.error(err.message || "Failed to delete meal");
    } finally {
      setDeleting(null);
    }
  }

  // Dynamic ring: two-color conic border reflecting calorie progress
  const ringStyle = {
    background: `conic-gradient(#ef4444 ${calPct * 3.6}deg, #ffe4e6 0deg)`,
    borderRadius: "50%",
  };

  return (
    <>
      <div className="mt-6 rounded-[28px] bg-white p-5 shadow-[0_16px_45px_rgba(244,63,94,0.09)]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-4xl font-black text-slate-900">{Math.round(calLeft)}</h2>
            <p className="text-xs text-slate-500">Calories left</p>
            <p className="mt-1 text-[10px] text-slate-400">{Math.round(calConsumed)} / {calGoal} kcal consumed</p>
          </div>
          <button
            onClick={() => setScreen("progress")}
            className="relative grid h-20 w-20 place-items-center rounded-full"
            style={ringStyle}
          >
            <div className="grid h-14 w-14 place-items-center rounded-full bg-white">
              <Flame className="text-red-500" size={22} />
            </div>
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <MacroCard
          title="Protein left"
          value={`${Math.round(proteinLeft)}g`}
          icon="🥩"
          progress={proteinPct}
        />
        <MacroCard
          title="Carbs left"
          value={`${Math.round(carbsLeft)}g`}
          icon="🍌"
          progress={carbsPct}
        />
        <MacroCard
          title="Fats left"
          value={`${Math.round(fatsLeft)}g`}
          icon="💧"
          progress={fatsPct}
        />
      </div>

      <SectionTitle title="Recently logged" action="See all" />
      {s1.recentMeals.length === 0 && (
        <p className="text-center text-xs text-slate-400 py-4">No meals logged today yet.</p>
      )}
      {s1.recentMeals.map((meal) => (
        <div
          key={meal.id}
          onClick={() => handleViewDetails(meal.id)}
          className="mb-3 flex w-full items-center gap-3 rounded-[22px] bg-white p-3 shadow-sm cursor-pointer hover:bg-slate-50 transition-colors"
        >
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-orange-50">
            <ProtectedImage 
              src={meal.imageUrl} 
              alt={meal.title} 
              className="h-full w-full object-cover" 
              fallback={<div className="grid h-full w-full place-items-center text-2xl">{meal.imageEmoji || "🍽️"}</div>} 
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate font-bold text-slate-800">{meal.title}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {Math.round(meal.calories)} kcal • {Math.round(meal.protein || 0)}g P • {Math.round(meal.carbs || 0)}g C • {Math.round(meal.fat || 0)}g F
            </p>
          </div>
          <button
            onClick={(e) => handleDelete(e, meal.id)}
            disabled={deleting === meal.id}
            className="ml-1 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-rose-50 text-rose-400 transition-all active:scale-90 disabled:opacity-40"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}
    </>
  );
}


function HomeHealthCard({ data, setScreen }) {
  const s2 = data?.slide2 || fallbackDashboard.slide2;
  const micro = s2.micronutrients;
  const { setAnalysis, userGoals } = useStore();
  const GOALS = userGoals ? { ...DEFAULT_GOALS, ...userGoals, fats: userGoals.fat ?? DEFAULT_GOALS.fats } : DEFAULT_GOALS;
  const [loadingMeal, setLoadingMeal] = useState(false);

  async function handleViewDetails(mealId) {
    if (loadingMeal) return;
    setLoadingMeal(true);
    try {
      const meal = await getMeal(mealId);
      setAnalysis(meal);
      setScreen("analysis");
    } catch (err) {
      toast.error(err.message || "Failed to load meal details");
    } finally {
      setLoadingMeal(false);
    }
  }

  // Use consumed values from API (backend computes them from real logged data)
  const fiberConsumed  = micro.fiberConsumed  ?? 0;
  const sugarConsumed  = micro.sugarConsumed  ?? 0;
  const sodiumConsumed = micro.sodiumConsumed ?? 0;

  const fiberLeft = Math.max(0, GOALS.fiber - fiberConsumed);
  const sugarLeft = Math.max(0, GOALS.sugar - sugarConsumed);
  const sodiumLeft = Math.max(0, GOALS.sodium - sodiumConsumed);

  const fiberPct  = Math.min(100, Math.round((fiberConsumed  / GOALS.fiber)  * 100));
  const sugarPct  = Math.min(100, Math.round((sugarConsumed  / GOALS.sugar)  * 100));
  const sodiumPct = Math.min(100, Math.round((sodiumConsumed / GOALS.sodium) * 100));

  return (
    <>
      <div className="mt-6 grid grid-cols-3 gap-3">
        <MacroCard value={`${Math.round(fiberLeft)}g`}  title="Fiber left"  icon="🍃" progress={fiberPct} />
        <MacroCard value={`${Math.round(sugarLeft)}g`}  title="Sugar left"  icon="💎" progress={sugarPct} />
        <MacroCard value={`${Math.round(sodiumLeft)}g`} title="Sodium left" icon="✨" progress={sodiumPct} />
      </div>

      <div className="mt-5 rounded-[28px] bg-white p-5 shadow-[0_16px_45px_rgba(244,63,94,0.09)]">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-black text-slate-900">Health score</h3>
          <span className="text-3xl font-black text-red-500">{s2.healthScore}/10</span>
        </div>

        <div className="mt-4 h-3 rounded-full bg-rose-100">
          <div
            style={{ width: `${s2.healthScore * 10}%` }}
            className="h-3 rounded-full bg-gradient-to-r from-rose-400 to-red-500 transition-all duration-500"
          />
        </div>

        <p className="mt-4 text-sm leading-7 text-slate-500">{s2.healthMessage}</p>
      </div>

      <SectionTitle title="Recently logged" action="See all" />
      {s2.recentMeals.length === 0 && (
        <p className="text-center text-xs text-slate-400 py-4">No meals logged today yet.</p>
      )}
      {s2.recentMeals.map((meal) => (
        <button
          key={meal.id}
          onClick={() => handleViewDetails(meal.id)}
          className="mb-3 flex w-full items-center gap-3 rounded-[22px] bg-white p-3 text-left shadow-sm hover:bg-slate-50 transition-colors"
        >
          {/* Scanned food emoji from backend */}
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-rose-50 to-orange-50 text-3xl shadow-inner">
            {meal.imageEmoji || "🍽️"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate font-bold text-slate-800">{meal.title}</p>
            <p className="text-xs text-slate-400">
              {Math.round(meal.calories)} kcal • {Math.round(meal.protein || 0)}g protein • {Math.round(meal.carbs || 0)}g carbs
            </p>
          </div>
          <ChevronRight size={18} className="text-slate-300 shrink-0" />
        </button>
      ))}
    </>
  );
}


function HomeWaterCard() {
  const STEP_GOAL = 8000;

  const [stepsToday,   setStepsToday]   = useState(0);
  const [calsBurned,   setCalsBurned]   = useState(0);
  const [distanceKm,   setDistanceKm]   = useState(0);
  const [activeMin,    setActiveMin]    = useState(0);
  const [stepInput,    setStepInput]    = useState("");
  const [logging,      setLogging]      = useState(false);
  const [fetching,     setFetching]     = useState(true);
  const [showForm,     setShowForm]     = useState(false);

  const fetchToday = useCallback(async () => {
    setFetching(true);
    try {
      const d = await getStepsToday();
      setStepsToday(d.steps          || 0);
      setCalsBurned(d.caloriesBurned || 0);
      setDistanceKm(d.distanceKm     || 0);
      setActiveMin (d.activeMinutes  || 0);
    } catch {
      // silently keep zeros — backend might be unreachable
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => { fetchToday(); }, [fetchToday]);

  async function handleLogSteps(e) {
    e.preventDefault();
    const n = parseInt(stepInput, 10);
    if (!n || n <= 0) { toast.error("Enter a valid step count."); return; }
    setLogging(true);
    try {
      // Derive calories: ~0.04 kcal / step; distance: ~0.0008 km / step (80 cm stride)
      const derived_cals = parseFloat((n * 0.04).toFixed(1));
      const derived_dist = parseFloat((n * 0.0008).toFixed(2));
      await logSteps(n, derived_cals, derived_dist);
      toast.success(`${n.toLocaleString()} steps logged! 🏃`);
      setStepInput("");
      setShowForm(false);
      await fetchToday();
    } catch (err) {
      toast.error(err.message || "Failed to log steps.");
    } finally {
      setLogging(false);
    }
  }

  // Goal-ring geometry
  const pct        = Math.min(100, Math.round((stepsToday / STEP_GOAL) * 100));
  const RADIUS      = 44;
  const CIRC        = 2 * Math.PI * RADIUS;
  const strokeDash  = (pct / 100) * CIRC;
  const goalMet     = stepsToday >= STEP_GOAL;

  return (
    <>
      {/* ── Steps ring card ─────────────────────────────────────────────── */}
      <div className="mt-6 rounded-[28px] bg-white p-5 shadow-[0_16px_45px_rgba(244,63,94,0.09)]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Footprints size={18} className="text-rose-500" />
            <h2 className="text-xl font-black text-slate-900">Steps Today</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchToday}
              disabled={fetching}
              className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-slate-400 transition-all active:scale-90 disabled:opacity-40"
            >
              <RefreshCcw size={13} className={fetching ? "animate-spin" : ""} />
            </button>
            <button
              onClick={() => setShowForm(f => !f)}
              className="grid h-8 w-8 place-items-center rounded-full bg-rose-50 text-rose-500 transition-all active:scale-90"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>

        {/* Ring + stats row */}
        <div className="flex items-center gap-6">
          {/* Goal ring */}
          <div className="relative shrink-0" style={{ width: 108, height: 108 }}>
            <svg width={108} height={108} viewBox="0 0 108 108" style={{ transform: "rotate(-90deg)" }}>
              {/* Track */}
              <circle cx={54} cy={54} r={RADIUS} fill="none" stroke="#f1f5f9" strokeWidth={10} />
              {/* Progress */}
              <circle
                cx={54} cy={54} r={RADIUS} fill="none"
                stroke={goalMet ? "#10b981" : "#f43f5e"}
                strokeWidth={10}
                strokeLinecap="round"
                strokeDasharray={`${strokeDash} ${CIRC}`}
                style={{ transition: "stroke-dasharray 0.6s ease" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-black text-slate-900 leading-none">
                {fetching ? "…" : stepsToday.toLocaleString()}
              </span>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">steps</span>
            </div>
          </div>

          {/* Stats column */}
          <div className="flex-1 space-y-3">
            <div>
              <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
                <span>Goal</span><span className={goalMet ? "text-emerald-500" : "text-rose-500"}>{pct}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${ goalMet ? "bg-emerald-400" : "bg-rose-400" }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5 font-medium">{stepsToday.toLocaleString()} / {STEP_GOAL.toLocaleString()}</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-[14px] bg-orange-50 px-3 py-2">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Burned</p>
                <p className="text-base font-black text-orange-500">{Math.round(calsBurned)} <span className="text-[10px] font-bold text-slate-400">kcal</span></p>
              </div>
              <div className="rounded-[14px] bg-sky-50 px-3 py-2">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Distance</p>
                <p className="text-base font-black text-sky-500">{distanceKm.toFixed(1)} <span className="text-[10px] font-bold text-slate-400">km</span></p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Manual entry form (toggled by + button) ─────────────────── */}
        {showForm && (
          <form
            onSubmit={handleLogSteps}
            className="mt-4 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200"
          >
            <input
              type="number"
              min="1"
              max="100000"
              placeholder="Steps walked…"
              value={stepInput}
              onChange={e => setStepInput(e.target.value)}
              className="flex-1 rounded-[14px] border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-800 placeholder:text-slate-400 focus:border-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-100"
            />
            <button
              type="submit"
              disabled={logging}
              className="rounded-[14px] bg-rose-500 px-4 py-2.5 text-xs font-black text-white shadow-sm shadow-rose-200 transition-all active:scale-95 disabled:opacity-50"
            >
              {logging ? "…" : "Log"}
            </button>
          </form>
        )}

        {/* ── Health Connect placeholder (Phase 3) ─────────────────────── */}
        <button
          disabled
          title="Connect Health — coming soon"
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-[14px] border border-dashed border-slate-200 py-2.5 text-xs font-black text-slate-300 cursor-not-allowed"
        >
          <Heart size={13} />
          Connect Health (Android — coming soon)
        </button>
      </div>

      {/* ── Active minutes ──────────────────────────────────────────────── */}
      {activeMin > 0 && (
        <div className="mt-4 rounded-[22px] bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-100 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap size={15} className="text-violet-500" />
            <span className="text-xs font-black text-violet-700">Active Minutes</span>
          </div>
          <span className="text-sm font-black text-violet-600">{activeMin} min</span>
        </div>
      )}
    </>
  );
}

// ─── Page dots ─────────────────────────────────────────────────────────────────

function PageDots({ count, current, onChange }) {
  return (
    <div className="mt-3 flex justify-center gap-1">
      {Array.from({ length: count }).map((_, i) => (
        <button
          key={i}
          onClick={() => onChange(i)}
          className={`h-2 rounded-full transition-all ${
            current === i ? "w-5 bg-red-400" : "w-2 bg-slate-300"
          }`}
        />
      ))}
    </div>
  );
}

// ─── Main screen ───────────────────────────────────────────────────────────────

export function HomeScreen() {
  const setScreen = useStore((state) => state.setScreen);
  const storedDashboard = useStore((state) => state.dashboard);
  const setDashboard = useStore((state) => state.setDashboard);
  const { data: apiData, loading, reload } = useApi(getDashboard, fallbackDashboard);

  const synced = React.useRef(false);
  React.useEffect(() => {
    if (apiData && apiData !== fallbackDashboard && !synced.current) {
      setDashboard(apiData);
      synced.current = true;
    }
  }, [apiData, setDashboard]);

  // Always prefer Zustand store (updated by mutations) over raw API data
  const dashboard = storedDashboard || apiData || fallbackDashboard;
  const [homePage, setHomePage] = useState(0);

  return (
    <div className="relative flex-1 overflow-y-auto bg-gradient-to-b from-[#fff4f6] via-[#fffafa] to-white px-6 pb-36">
      <LoadingOverlay loading={loading} />
      <Header data={dashboard} />
      <DayStrip />
      <button onClick={reload} className="absolute right-6 top-14 text-slate-300">
        <RefreshCcw size={16} />
      </button>

      {homePage === 0 && <HomeCaloriesCard data={dashboard} setScreen={setScreen} />}
      {homePage === 1 && <HomeHealthCard data={dashboard} setScreen={setScreen} />}
      {homePage === 2 && <HomeWaterCard />}

      <PageDots count={3} current={homePage} onChange={setHomePage} />

      <div className="mt-6 rounded-[24px] bg-white/70 p-4 text-center text-xs text-slate-400 shadow-sm">
        Swipe to view health score and hydration tracker
      </div>
    </div>
  );
}
