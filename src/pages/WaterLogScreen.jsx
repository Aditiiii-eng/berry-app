import React, { useState, useEffect } from "react";
import { ArrowLeft, Droplet, Coffee, Beer, GlassWater, Trophy, ChevronRight, Activity, Plus } from "lucide-react";
import { useStore, SCREENS } from "../store/useStore";
import { LoadingOverlay, DayStrip } from "../components/ui";
import { getWaterHistory, logWater } from "../api/progress";
import toast from 'react-hot-toast';

export function WaterLogScreen() {
  const { setScreen, dashboard, setDashboard, setMealPlan } = useStore();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [logging, setLogging] = useState(false);

  const waterData = dashboard?.slide3?.water || { currentMl: 0, goalMl: 2500 };
  const percentage = Math.round((waterData.currentMl / waterData.goalMl) * 100) || 0;
  const left = Math.max(0, waterData.goalMl - waterData.currentMl);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await getWaterHistory();
      if (res && res.logs) {
        setHistory(res.logs.map(log => ({
          id: log.id,
          time: new Date(log.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          rawTime: new Date(log.time),
          amount: `${log.amount_ml}ml`,
          type: "Water",
          icon: <Droplet size={16} className="text-blue-500" />
        })));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleAddLog = async () => {
    if (logging) return;
    try {
      setLogging(true);
      const res = await logWater(250);
      if (res.dashboard) setDashboard(res.dashboard);
      if (res.mealPlan) setMealPlan(res.mealPlan);
      await fetchHistory();
    } catch (e) {
      toast.error("Failed to log water: " + e.message);
    } finally {
      setLogging(false);
    }
  };

  // Calculate Average Interval
  let avgInterval = "0 hrs";
  if (history.length > 1) {
    const times = history.map(h => h.rawTime.getTime()).sort((a, b) => a - b);
    const diffMs = times[times.length - 1] - times[0];
    const avgMs = diffMs / (times.length - 1);
    const avgHrs = avgMs / (1000 * 60 * 60);
    avgInterval = avgHrs < 1 ? `${Math.round(avgHrs * 60)} mins` : `${avgHrs.toFixed(1)} hrs`;
  }

  return (
    <div className="relative flex-1 overflow-y-auto bg-[#fdfdfd] px-6 pb-28">
      <LoadingOverlay loading={loading} />
      <div className="sticky top-0 z-20 -mx-6 flex items-center justify-between bg-white/80 px-6 py-6 backdrop-blur-md">
        <button 
          onClick={() => setScreen(SCREENS.HOME)}
          className="grid h-10 w-10 place-items-center rounded-full bg-slate-50 text-slate-600 shadow-sm"
        >
          <ArrowLeft size={20} />
        </button>
        <b className="text-sm font-black uppercase tracking-widest text-slate-400">Hydration Details</b>
        <div className="h-10 w-10" />
      </div>

      <DayStrip />

      {/* Main Progress Card */}
      <div className="mt-8 rounded-[32px] bg-gradient-to-br from-blue-500 to-blue-600 p-8 text-white shadow-xl shadow-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-4xl font-black">{waterData.currentMl}</h2>
            <p className="text-sm font-bold opacity-80">Milliliters today</p>
          </div>
          <div className="grid h-20 w-20 place-items-center rounded-full bg-white/20 text-4xl backdrop-blur-sm">
            💧
          </div>
        </div>
        
        <div className="mt-8">
          <div className="flex justify-between text-xs font-black uppercase tracking-wider opacity-80">
            <span>Daily Goal</span>
            <span>{percentage}%</span>
          </div>
          <div className="mt-2 h-3 w-full rounded-full bg-white/20">
            <div 
              className="h-3 rounded-full bg-white shadow-[0_0_15px_rgba(255,255,255,0.5)] transition-all duration-700" 
              style={{ width: `${Math.min(100, percentage)}%` }}
            />
          </div>
          <p className="mt-4 text-center text-xs font-bold italic opacity-70">
            {left > 0 ? `You need ${left}ml more to hit your goal!` : "Goal achieved! Stay hydrated!"}
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Drinks Logged</p>
          <h4 className="mt-2 text-xl font-black text-slate-800">{history.length} Glasses</h4>
        </div>
        <div className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Avg Interval</p>
          <h4 className="mt-2 text-xl font-black text-slate-800">{avgInterval}</h4>
        </div>
      </div>

      <div className="mb-4 mt-8 flex items-center justify-between">
        <h3 className="text-[12px] font-black uppercase tracking-wider text-slate-400">Drink History</h3>
      </div>

      <div className="space-y-3">
        {history.length === 0 && !loading && (
          <div className="text-center text-sm font-bold text-slate-400 py-4">No drinks logged today.</div>
        )}
        {[...history].reverse().map((log) => (
          <div key={log.id} className="flex items-center gap-4 rounded-[24px] bg-white p-4 shadow-sm ring-1 ring-slate-100 transition-all active:scale-[0.98]">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-slate-50">
              {log.icon}
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-black text-slate-800">{log.type}</h4>
              <p className="text-[11px] font-bold text-slate-400">{log.time}</p>
            </div>
            <b className="text-sm font-black text-blue-500">+{log.amount}</b>
          </div>
        ))}
      </div>

      <button 
        onClick={handleAddLog}
        disabled={logging}
        className="mt-8 flex w-full items-center justify-center gap-3 rounded-[28px] bg-blue-500 py-6 text-sm font-black uppercase tracking-widest text-white shadow-xl shadow-blue-200 active:scale-95 transition-transform disabled:opacity-50"
      >
        {logging ? <span className="animate-pulse">Logging...</span> : (
          <>
            <GlassWater size={20} />
            Add New Log (250ml)
          </>
        )}
      </button>

      {percentage >= 100 && (
        <div className="mt-10 rounded-[32px] bg-blue-50 p-6 text-center border-2 border-dashed border-blue-100">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-blue-100 text-blue-600">
            <Trophy size={22} />
          </div>
          <h4 className="mt-3 text-sm font-black text-blue-900">Hydration Hero</h4>
          <p className="mt-1 text-xs font-bold text-blue-400">You've hit your goal for today!</p>
        </div>
      )}
    </div>
  );
}
