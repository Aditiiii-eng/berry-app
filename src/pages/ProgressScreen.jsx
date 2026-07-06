import React, { useState, useEffect, useCallback } from "react";
import { Camera, Plus, Trash2, Sparkles, Activity, TrendingUp, Flame, Utensils, Target, CalendarDays } from "lucide-react";
import { useStore } from "../store/useStore";
import { Header, DayStrip } from "../components/ui";
import toast from "react-hot-toast";
import { getDailyAnalytics, getWeeklyAnalytics } from "../api/analytics";
import { getWeightHistory, getStreak } from "../api/progress";

function PageDots({ count, current, onChange }) {
  return (
    <div className="mt-3 flex justify-center gap-1">
      {Array.from({ length: count }).map((_, i) => (
        <button
          key={i}
          onClick={() => onChange(i)}
          className={`h-2 rounded-full transition-all ${
            current === i ? "w-5 bg-rose-500" : "w-2 bg-slate-300"
          }`}
        />
      ))}
    </div>
  );
}

// A simple SVG Line Chart
function LineChart({ data, width = 300, height = 150 }) {
  if (!data || data.length === 0) return <div className="h-full w-full flex items-center justify-center text-slate-400 text-sm font-bold">No Data</div>;
  
  const min = Math.min(...data.map(d => d.value));
  const max = Math.max(...data.map(d => d.value));
  const range = max - min || 1;
  
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1 || 1)) * width;
    const y = height - ((d.value - min) / range) * (height - 20) - 10;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
      <polyline
        fill="none"
        stroke="#fb4b6b"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
      {data.map((d, i) => {
        const x = (i / (data.length - 1 || 1)) * width;
        const y = height - ((d.value - min) / range) * (height - 20) - 10;
        return <circle key={i} cx={x} cy={y} r="4" fill="white" stroke="#fb4b6b" strokeWidth="2" />;
      })}
    </svg>
  );
}

// A simple SVG Bar Chart
function BarChart({ data, width = 300, height = 150 }) {
  if (!data || data.length === 0) return <div className="h-full w-full flex items-center justify-center text-slate-400 text-sm font-bold">No Data</div>;

  const max = Math.max(...data.map(d => Math.max(d.value, d.goal || 0)));
  const barWidth = width / data.length - 8;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
      {data.map((d, i) => {
        const x = (i * (width / data.length)) + 4;
        const h = max === 0 ? 0 : (d.value / max) * height;
        const y = height - h;
        const isGoalMet = d.value >= (d.goal || 0) && d.goal > 0;
        
        return (
          <g key={i}>
            {/* Background / Goal bar */}
            {d.goal > 0 && max > 0 && (
              <rect x={x} y={height - ((d.goal / max) * height)} width={barWidth} height={(d.goal / max) * height} rx="4" fill="#f1f5f9" />
            )}
            {/* Actual value bar */}
            <rect x={x} y={y} width={barWidth} height={h} rx="4" fill={isGoalMet ? "#10b981" : "#fb4b6b"} />
          </g>
        );
      })}
    </svg>
  );
}


export function ProgressScreen() {
  const dashboard = useStore((s) => s.dashboard);
  const userGoals = useStore((s) => s.userGoals);
  const selectedDate = useStore((s) => s.selectedDate); // "YYYY-MM-DD" or null (today)
  const [progressPage, setProgressPage] = useState(0);
  
  const [loading, setLoading] = useState(true);
  const [dailyData, setDailyData] = useState(null);
  const [weeklyData, setWeeklyData] = useState(null);
  const [weightHistory, setWeightHistory] = useState([]);
  const [streak, setStreak] = useState(0);

  const [photos, setPhotos] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("berry_progress_photos") || "[]");
    } catch {
      return [];
    }
  });

  const fetchData = useCallback(async (date) => {
    try {
      setLoading(true);
      const [dailyRes, weeklyRes, weightRes, streakRes] = await Promise.allSettled([
        getDailyAnalytics(date || null),
        getWeeklyAnalytics(),
        getWeightHistory(30).catch(() => []),
        getStreak().catch(() => ({ streak: 0 }))
      ]);

      if (dailyRes.status === "fulfilled") setDailyData(dailyRes.value);
      if (weeklyRes.status === "fulfilled") setWeeklyData(weeklyRes.value);
      if (weightRes.status === "fulfilled") setWeightHistory(Array.isArray(weightRes.value) ? weightRes.value : []);
      if (streakRes.status === "fulfilled") setStreak(streakRes.value.streak || 0);

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Re-fetch whenever selected date changes
  useEffect(() => {
    fetchData(selectedDate);
  }, [fetchData, selectedDate]);


  // ── Photo Logic ──────────────────────────────────────────────────────────────
  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const newPhoto = {
        id: Date.now().toString(),
        url: reader.result,
        date: new Date().toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }),
      };
      const updated = [newPhoto, ...photos];
      setPhotos(updated);
      localStorage.setItem("berry_progress_photos", JSON.stringify(updated));
      toast.success("Photo added successfully! 📸");
    };
    reader.readAsDataURL(file);
  };

  const handleDeletePhoto = (id) => {
    const updated = photos.filter(p => p.id !== id);
    setPhotos(updated);
    localStorage.setItem("berry_progress_photos", JSON.stringify(updated));
    toast.success("Photo deleted.");
  };

  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [showCompareReport, setShowCompareReport] = useState(false);

  const toggleSelectPhoto = (id) => {
    if (selectedPhotos.includes(id)) {
      setSelectedPhotos(selectedPhotos.filter((x) => x !== id));
    } else {
      if (selectedPhotos.length >= 2) {
        toast.error("Select up to 2 photos to compare");
        return;
      }
      setSelectedPhotos([...selectedPhotos, id]);
    }
  };

  const compareP1 = selectedPhotos.length === 2 ? photos.find(p => p.id === selectedPhotos[0]) : null;
  const compareP2 = selectedPhotos.length === 2 ? photos.find(p => p.id === selectedPhotos[1]) : null;
  const diffDays = compareP1 && compareP2 ? Math.ceil(Math.abs(new Date(parseInt(compareP2.id)) - new Date(parseInt(compareP1.id))) / (1000 * 60 * 60 * 24)) : 0;

  // ── Data Formatting ──────────────────────────────────────────────────────────
  const DEFAULT_GOALS = { calories: 2200, protein: 150, carbs: 250, fats: 70 };
  const GOALS = userGoals ? { ...DEFAULT_GOALS, ...userGoals, fats: userGoals.fat ?? DEFAULT_GOALS.fats } : DEFAULT_GOALS;

  // Backend wraps macros inside a "totals" key: { totals: { calories, protein, ... }, goals, byMealType, topFoods }
  // Fall back to flat structure for mock API compatibility.
  const totals = dailyData?.totals ?? dailyData;
  const calConsumed = totals?.calories || 0;
  const proteinConsumed = totals?.protein || 0;
  const carbsConsumed = totals?.carbs || 0;
  const fatConsumed = totals?.fat || 0;

  const calPct = Math.min(100, Math.round((calConsumed / GOALS.calories) * 100));
  const proteinPct = Math.min(100, Math.round((proteinConsumed / GOALS.protein) * 100));
  const carbsPct = Math.min(100, Math.round((carbsConsumed / GOALS.carbs) * 100));
  const fatPct = Math.min(100, Math.round((fatConsumed / GOALS.fats) * 100));

  const weeklyChartData = (weeklyData?.days || []).map(d => ({
    label: new Date(d.date).toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 1),
    value: d.calories,
    goal: d.goal || GOALS.calories
  }));

  const weightChartData = weightHistory.map(w => ({
    label: w.date,
    value: w.weight_kg
  }));
  const currentWeight = weightHistory.length > 0 ? weightHistory[weightHistory.length - 1].weight_kg : 0;

  return (
    <div className="relative flex-1 flex flex-col h-full overflow-hidden bg-[#fdfdfd]">
      <div className="flex-1 overflow-y-auto px-6 pb-36 scrollbar-hide">
        <Header data={dashboard || { user: { name: "Berry" } }} />
        <DayStrip />

        {/* Date Context Banner */}
        {selectedDate && (
          <div className="mt-4 flex items-center gap-2 rounded-[16px] bg-amber-50 border border-amber-200 px-4 py-2.5">
            <CalendarDays size={15} className="text-amber-500 shrink-0" />
            <p className="text-xs font-black text-amber-700">
              Viewing record for{" "}
              {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </p>
          </div>
        )}
        {loading && <div className="mt-10 text-center text-slate-400 font-bold animate-pulse">Loading Analytics...</div>}

        {!loading && progressPage === 0 && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* Daily Summary */}
            <div className="mt-6 rounded-[28px] bg-gradient-to-br from-rose-400 to-rose-600 p-5 text-white shadow-xl shadow-rose-200">
              <div className="flex justify-between">
                <div>
                  <h2 className="text-lg font-black">Daily Summary</h2>
                  <p className="text-sm opacity-90">
                    {calConsumed > 0 ? "You're crushing it!" : "Start logging to track your day!"}
                  </p>
                </div>
                <span className="h-fit rounded-full bg-white/20 px-4 py-2 text-xs font-bold backdrop-blur-md">Today</span>
              </div>

              <div className="mt-5 flex items-center gap-5">
                <div
                  className="grid h-24 w-24 shrink-0 place-items-center rounded-full border-[7px] border-white/20 text-center relative"
                  style={{ background: `conic-gradient(white ${calPct * 3.6}deg, transparent 0deg)` }}
                >
                  <div className="absolute inset-[6px] bg-rose-500 rounded-full flex flex-col items-center justify-center">
                    <h3 className="text-xl font-black">{Math.round(Math.max(0, GOALS.calories - calConsumed)).toLocaleString()}</h3>
                    <p className="text-[10px] font-bold opacity-90 tracking-widest">LEFT</p>
                  </div>
                </div>

                <div className="flex-1 space-y-2 text-xs font-bold">
                  {[
                    { emoji: "🟡", label: "Carbs", consumed: carbsConsumed, goal: GOALS.carbs, pct: carbsPct },
                    { emoji: "🟢", label: "Protein", consumed: proteinConsumed, goal: GOALS.protein, pct: proteinPct },
                    { emoji: "🔴", label: "Fat", consumed: fatConsumed, goal: GOALS.fats, pct: fatPct },
                  ].map(({ emoji, label, consumed, goal, pct }) => (
                    <div key={label}>
                      <div className="flex justify-between mb-0.5">
                        <span>{emoji} {label}</span>
                        <span className="opacity-80">{Math.round(consumed)}g / {goal}g</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-black/10 overflow-hidden">
                        <div className="h-full bg-white transition-all duration-700 ease-out" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <PageDots count={3} current={progressPage} onChange={setProgressPage} />

            {/* Weekly Calorie Trends */}
            <div className="mt-6 rounded-[28px] bg-white p-5 shadow-[0_16px_45px_rgba(244,63,94,0.08)]">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2 text-slate-800">
                  <Activity size={18} className="text-rose-500" />
                  <h2 className="text-xl font-black">Weekly Trends</h2>
                </div>
                <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-500">{weeklyData?.averages?.calories || 0} kcal avg</span>
              </div>
              <div className="h-32">
                <BarChart data={weeklyChartData} />
              </div>
              <div className="flex justify-between mt-2 px-1 text-[10px] font-bold text-slate-400 uppercase">
                {weeklyChartData.map((d, i) => <span key={i}>{d.label}</span>)}
              </div>
            </div>

            {/* Weight + Streak */}
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="rounded-[26px] bg-white p-5 shadow-[0_16px_45px_rgba(244,63,94,0.08)] flex flex-col justify-between">
                <div className="flex items-center gap-2 text-slate-500 font-black mb-2">
                  <TrendingUp size={16} /> Weight
                </div>
                {weightHistory.length > 0 ? (
                  <>
                    <h2 className="text-3xl font-black text-slate-800">
                      {currentWeight} <span className="text-sm text-slate-400">kg</span>
                    </h2>
                    <div className="h-12 mt-4 relative">
                      <LineChart data={weightChartData} />
                    </div>
                  </>
                ) : (
                  <p className="text-sm font-bold text-slate-400 py-4">No weight logged yet.</p>
                )}
              </div>

              <div className="rounded-[26px] bg-gradient-to-br from-orange-400 to-red-500 p-5 text-white shadow-[0_16px_45px_rgba(244,63,94,0.15)] flex flex-col justify-between text-center relative overflow-hidden">
                <Flame className="absolute -bottom-4 -right-4 w-24 h-24 text-white/10" />
                <p className="text-left font-black text-white/90">🔥 Streak</p>
                <div className="my-auto">
                  <h2 className="text-5xl font-black">{streak}</h2>
                  <p className="text-[10px] font-bold mt-1 text-white/80 uppercase tracking-wider">Days Active</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {!loading && progressPage === 1 && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="mt-6 rounded-[28px] bg-white p-5 shadow-[0_16px_45px_rgba(244,63,94,0.08)]">
              <div className="flex items-center gap-2 text-slate-800 mb-5">
                <Utensils size={18} className="text-rose-500" />
                <h2 className="text-xl font-black">Meal Breakdown</h2>
              </div>
              
              <div className="flex flex-col gap-3">
                {dailyData?.by_type && Object.entries(dailyData.by_type).map(([type, data]) => {
                  const pct = Math.min(100, (data.calories / Math.max(1, calConsumed)) * 100);
                  if (data.count === 0) return null;
                  
                  return (
                    <div key={type} className="bg-slate-50 rounded-[20px] p-4 flex items-center justify-between border border-slate-100">
                      <div>
                        <h4 className="font-black text-slate-700 text-sm">{type}</h4>
                        <p className="text-[10px] font-bold text-slate-400 mt-0.5">{data.count} meal{data.count > 1 ? 's' : ''}</p>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-slate-800">{Math.round(data.calories)} kcal</span>
                        <div className="w-20 h-1.5 bg-slate-200 rounded-full mt-1 ml-auto">
                          <div className="h-full bg-rose-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </div>
                  )
                })}
                {(!dailyData?.by_type || Object.values(dailyData.by_type).every(d => d.count === 0)) && (
                  <p className="text-sm font-bold text-slate-400 text-center py-4">No meals logged today.</p>
                )}
              </div>
            </div>

            <PageDots count={3} current={progressPage} onChange={setProgressPage} />

            <div className="mt-6 rounded-[28px] bg-white p-5 shadow-[0_16px_45px_rgba(244,63,94,0.08)]">
              <div className="flex items-center gap-2 text-slate-800 mb-5">
                <Target size={18} className="text-rose-500" />
                <h2 className="text-xl font-black">Top Foods Today</h2>
              </div>

              <div className="flex flex-col gap-3">
                {dailyData?.top_foods?.length > 0 ? (
                  dailyData.top_foods.map((food, i) => (
                    <div key={i} className="flex items-center justify-between border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center font-black text-xs">
                          {i + 1}
                        </div>
                        <div>
                          <p className="font-black text-slate-700 text-sm max-w-[150px] truncate">{food.name}</p>
                          <p className="text-[10px] font-bold text-slate-400">{Math.round(food.weight_grams)}g</p>
                        </div>
                      </div>
                      <span className="font-black text-rose-500 text-sm">{Math.round(food.calories)} kcal</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm font-bold text-slate-400 text-center py-4">Start logging foods to see insights.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {!loading && progressPage === 2 && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* Progress Photos */}
            <div className="mt-6 rounded-[28px] bg-white p-5 shadow-[0_16px_45px_rgba(244,63,94,0.08)]">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-slate-800">Progress Photos</h2>
                <label htmlFor="photo-upload" className="cursor-pointer flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-rose-500 active:opacity-60">
                  <Plus size={14} /> Add New
                </label>
              </div>
              
              <input
                type="file"
                accept="image/*"
                className="hidden"
                id="photo-upload"
                onChange={handlePhotoUpload}
              />

              {photos.length === 0 ? (
                <div className="mt-5 flex items-center gap-4">
                  <label htmlFor="photo-upload" className="cursor-pointer grid h-24 w-24 shrink-0 place-items-center rounded-[24px] border-2 border-dashed border-rose-300 text-rose-300 active:scale-95 transition-transform">
                    <Camera />
                  </label>
                  <div className="flex-1">
                    <h3 className="font-black text-slate-700">Snap your progress!</h3>
                    <p className="text-sm font-bold text-slate-400 mt-1">Visualize your journey with weekly photos.</p>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex justify-between items-center mt-3 mb-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                      {selectedPhotos.length > 0 ? `${selectedPhotos.length}/2 Selected` : "Tap photos to select & compare"}
                    </span>
                    {selectedPhotos.length === 2 && (
                      <button
                        onClick={() => setShowCompareReport(true)}
                        className="text-[11px] font-black uppercase text-rose-500 bg-rose-50 px-3 py-1.5 rounded-full shadow-sm animate-pulse"
                      >
                        Compare & Report 📊
                      </button>
                    )}
                  </div>

                  <div className="mt-3 flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                    <label htmlFor="photo-upload" className="cursor-pointer flex h-24 w-24 shrink-0 flex-col items-center justify-center rounded-[24px] border-2 border-dashed border-rose-200 bg-rose-50/20 text-rose-400 active:scale-95 transition-transform">
                      <Plus size={20} />
                      <span className="mt-1 text-[9px] font-black uppercase tracking-wider">Add Photo</span>
                    </label>
                    {photos.map((p) => {
                      const isSelected = selectedPhotos.includes(p.id);
                      return (
                        <div
                          key={p.id}
                          onClick={() => toggleSelectPhoto(p.id)}
                          className={`relative h-24 w-24 shrink-0 overflow-hidden rounded-[24px] border transition-all cursor-pointer shadow-sm ${
                            isSelected
                              ? "border-rose-500 ring-4 ring-rose-200 scale-95"
                              : "border-slate-100 hover:border-rose-200"
                          }`}
                        >
                          <img src={p.url} alt="Progress" className="h-full w-full object-cover" />
                          
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-2">
                            <span className="text-[8px] font-black text-white/95 uppercase">{p.date}</span>
                          </div>
                          
                          {isSelected && (
                            <div className="absolute top-1.5 left-1.5 bg-rose-500 text-white rounded-full p-0.5 text-[9px] font-bold shadow-sm">
                              ✓
                            </div>
                          )}

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeletePhoto(p.id);
                            }}
                            className="absolute right-1.5 top-1.5 z-10 grid h-5 w-5 place-items-center rounded-full bg-white/90 text-rose-500 shadow-sm active:scale-90"
                          >
                            <Trash2 size={10} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            <PageDots count={3} current={progressPage} onChange={setProgressPage} />
          </div>
        )}
      </div>

      {/* AI Comparison Modal */}
      {showCompareReport && compareP1 && compareP2 && (
        <div className="absolute inset-0 z-[2000] bg-black/60 backdrop-blur-sm flex flex-col justify-end">
          <div className="bg-gradient-to-b from-white to-[#fff8f9] rounded-t-[36px] p-6 pb-12 max-h-[90%] overflow-y-auto flex flex-col gap-5 shadow-2xl ring-1 ring-rose-100/50">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto -mt-2 mb-1" />
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center text-xl shadow-inner">
                  🍓
                </div>
                <div>
                  <h3 className="text-[17px] font-black text-slate-900 leading-tight">Berry AI Comparison</h3>
                  <p className="text-[11px] font-semibold text-slate-400 mt-0.5">Comparing progress over {diffDays} days</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowCompareReport(false);
                  setSelectedPhotos([]);
                }}
                className="h-8 w-8 rounded-full bg-slate-100/80 flex items-center justify-center text-slate-500 font-bold active:scale-95 transition-transform"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 bg-slate-50/50 p-3 rounded-[26px] border border-slate-100">
              <div className="flex flex-col gap-2">
                <div className="h-40 rounded-[20px] overflow-hidden border-2 border-white shadow-md relative">
                  <img src={compareP1.url} alt="Base" className="h-full w-full object-cover" />
                  <div className="absolute top-2 left-2 bg-black/50 text-[8px] font-black text-white px-2 py-0.5 rounded-full uppercase tracking-wider">Before</div>
                </div>
                <span className="text-[9px] font-black uppercase text-slate-400 text-center">{compareP1.date}</span>
              </div>
              <div className="flex flex-col gap-2">
                <div className="h-40 rounded-[20px] overflow-hidden border-2 border-white shadow-md relative">
                  <img src={compareP2.url} alt="Comparison" className="h-full w-full object-cover" />
                  <div className="absolute top-2 left-2 bg-rose-500 text-[8px] font-black text-white px-2 py-0.5 rounded-full uppercase tracking-wider">After</div>
                </div>
                <span className="text-[9px] font-black uppercase text-slate-400 text-center">{compareP2.date}</span>
              </div>
            </div>

            <div className="bg-white border border-rose-100 rounded-[24px] p-5 shadow-[0_12px_30px_rgba(244,63,94,0.04)] flex flex-col gap-3">
              <div className="flex items-center gap-1.5 border-b border-rose-50 pb-2">
                <Sparkles size={15} className="text-rose-500" />
                <span className="text-[10px] font-black uppercase tracking-wider text-rose-500">Analysis Summary</span>
              </div>
              <p className="text-[12px] font-semibold text-slate-600 leading-relaxed italic">
                "Comparing your posture and overall body line, we detect visible tone improvements around your midsection. Taking these photos {diffDays} days apart shows your dedication to capturing your visual transformation."
              </p>
            </div>

            <button
              onClick={() => {
                setShowCompareReport(false);
                setSelectedPhotos([]);
              }}
              className="w-full rounded-full bg-rose-500 py-3.5 text-xs font-black uppercase tracking-wide text-white shadow-lg shadow-rose-200 active:scale-95 transition-all mt-2"
            >
              Done & Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
