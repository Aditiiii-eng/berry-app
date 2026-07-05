import React, { useEffect } from "react";
import { Search, ArrowLeft, HeartPulse, Clock3, Flame, Play, ChevronRight, Plus } from "lucide-react";
import { useStore, SCREENS } from "../store/useStore";
import { useApi } from "../hooks/useApi";
import { getRecipes, getRecipe } from "../api/recipes";
import { LoadingOverlay, Header, SectionTitle, DayStrip } from "../components/ui";

const mockDashboard = { user: { name: "Berry", streak: 3 } };

import { berry } from "../components/BerryUI";

export function RecipesScreen() {
  const { setScreen, setSelectedRecipeId } = useStore();
  const { data, loading } = useApi(getRecipes, []);

  return (
    <div className={berry.screen}>
      <LoadingOverlay loading={loading} />
      
      <header className={berry.header}>
        <h1 className={berry.title}>Berry</h1>

        <button className="rounded-full bg-white px-3 py-2 text-[11px] font-black text-orange-500 shadow-sm">
          🔥 {mockDashboard.user.streak}
        </button>
      </header>

      <div className="mt-6 rounded-[28px] bg-white p-5 shadow-[0_16px_45px_rgba(244,63,94,0.08)]">
        <h2 className="text-[28px] font-black text-slate-900">450</h2>
        <p className="text-[12px] font-semibold text-slate-400">
          Calories in next meal
        </p>
      </div>

      <div className="mt-5 flex items-center gap-2 rounded-full bg-white px-4 py-3 shadow-sm">
        <Search size={17} className="text-slate-400" />
        <input
          placeholder="Search recipes"
          className="w-full bg-transparent text-[12px] font-semibold outline-none"
        />
      </div>

      {/* Dietary Filters */}
      <div className="mt-6 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {["All", "Vegetarian", "Vegan", "Keto", "High Protein", "Low Carb"].map((f) => (
          <button
            key={f}
            className={`shrink-0 rounded-full px-5 py-2.5 text-[10px] font-black uppercase tracking-wider transition-all ${
              f === "All" ? "bg-red-500 text-white shadow-lg shadow-red-200" : "bg-white text-slate-400 ring-1 ring-slate-100"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <SectionTitle title="Recommended for you" action="See all" />
      
      <div className="space-y-4">
        {data?.map((r) => (
          <button
            key={r.id}
            onClick={() => { setSelectedRecipeId(r.id); setScreen("recipeDetail"); }}
            className="flex w-full items-center gap-4 rounded-[28px] bg-white p-4 shadow-[0_8px_30px_rgba(0,0,0,0.04)] ring-1 ring-slate-50 transition-all active:scale-[0.98]"
          >
            <div className="grid h-20 w-20 shrink-0 place-items-center rounded-[22px] bg-rose-50 text-4xl">
              {r.emoji}
            </div>
            <div className="flex-1 text-left">
              <h4 className="text-sm font-black text-slate-800">{r.title}</h4>
              <p className="mt-1 text-[11px] font-bold text-slate-400">{r.calories} kcal • {r.time}</p>
              
              <div className="mt-2 flex items-center gap-1.5">
                <div className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-[8px] font-black uppercase text-indigo-500">
                  95% Match
                </div>
                <div className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[8px] font-black uppercase text-emerald-500">
                  Healthy
                </div>
              </div>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-full bg-slate-50 text-slate-300">
              <ChevronRight size={18} />
            </div>
          </button>
        ))}
      </div>

      <button className="mt-8 flex w-full items-center justify-center gap-3 rounded-[28px] border-2 border-dashed border-rose-100 py-6 text-sm font-black text-rose-400 active:bg-rose-50">
        <Plus size={20} />
        Add Custom Recipe
      </button>
    </div>
  );
}

function Info({ icon, title }) {
  return (
    <div className="rounded-[18px] bg-rose-50 p-3 text-center text-red-500">
      <div className="mx-auto grid place-items-center">{icon}</div>
      <b className="mt-1 block text-xs">{title}</b>
    </div>
  );
}

export function RecipeDetail() {
  const { setScreen, selectedRecipeId, tempRecipe } = useStore();

  const handleStartCooking = () => {
    setScreen(SCREENS.COOKING_MODE);
  };

  useEffect(() => {
    if (!selectedRecipeId && !tempRecipe) {
      setScreen("recipes");
    }
  }, [selectedRecipeId, tempRecipe, setScreen]);

  if (!selectedRecipeId && !tempRecipe) return null;

  // If we have a tempRecipe, use it directly. Otherwise, fetch.
  const isTemp = !!tempRecipe;
  const { data: apiData, loading } = useApi(
    () => isTemp ? Promise.resolve(tempRecipe) : getRecipe(selectedRecipeId),
    tempRecipe,
    [selectedRecipeId, isTemp]
  );

  const data = apiData || tempRecipe;

  if (!data && !loading) return null;

  return (
    <div className="relative flex-1 overflow-y-auto bg-[#0a0a0b] px-6 pb-28 text-white">
      <LoadingOverlay loading={loading} />
      
      <div className="sticky top-0 z-20 -mx-6 flex items-center justify-between bg-[#0a0a0b]/80 px-6 py-6 backdrop-blur-md">
        <button 
          onClick={() => setScreen(isTemp ? SCREENS.GROCERY : "recipes")}
          className="grid h-10 w-10 place-items-center rounded-full bg-white/10"
        >
          <ArrowLeft size={20} />
        </button>
        <b className="text-sm font-black uppercase tracking-widest text-slate-400">
          {isTemp ? "AI Generation" : "Recipe Detail"}
        </b>
        <div className="h-10 w-10" />
      </div>

      {data && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col items-center text-center">
            <div className="grid h-32 w-32 place-items-center rounded-[40px] bg-white/5 text-6xl shadow-2xl">
              {data.emoji || "🍳"}
            </div>
            <h1 className="mt-6 text-3xl font-black leading-tight text-white">{data.title}</h1>
            <div className="mt-4 flex items-center gap-4 text-slate-500">
              <div className="flex items-center gap-1.5 text-xs font-bold">
                <Clock3 size={14} className="text-rose-500" /> {data.time}
              </div>
              <div className="h-1 w-1 rounded-full bg-slate-700" />
              <div className="flex items-center gap-1.5 text-xs font-bold">
                <Flame size={14} className="text-orange-500" /> {data.calories} kcal
              </div>
            </div>
          </div>

          <div className="mt-10 space-y-8">
            {/* Ingredients Summary like img 2 */}
            <div className="rounded-[32px] bg-white/5 p-6 ring-1 ring-white/10">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-rose-500">
                Ingredients List
              </h3>
              <div className="mt-6 space-y-4">
                {data.ingredients?.map((x, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
                    <div className="flex flex-1 justify-between">
                      <p className="text-sm font-bold text-slate-200">{x}</p>
                      {x.toLowerCase().includes("sugar") && (
                        <span className="text-[10px] font-black text-indigo-400">Swap: Stevia</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Steps Summary */}
            <div className="rounded-[32px] bg-white/5 p-6 ring-1 ring-white/10">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-indigo-400">
                Cooking Steps
              </h3>
              <div className="mt-6 space-y-6">
                {(data.instructions || [
                  "Prepare ingredients thoroughly",
                  "Heat pan over medium heat",
                  "Sauté until golden brown",
                  "Serve and enjoy fresh"
                ]).map((step, i) => (
                  <div key={i} className="flex gap-4">
                    <span className="text-[10px] font-black text-slate-600">0{i + 1}</span>
                    <p className="text-sm font-medium leading-relaxed text-slate-300">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <button 
            onClick={handleStartCooking}
            className="mt-10 flex w-full items-center justify-center gap-3 rounded-[28px] bg-rose-500 py-6 text-sm font-black uppercase tracking-widest text-white shadow-2xl shadow-rose-900/40 transition-all active:scale-95"
          >
            <Play size={18} fill="currentColor" />
            Launch Cooking Mode
          </button>

          <p className="mt-6 text-center text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Nutritional data verified by Berry AI
          </p>
        </div>
      )}
    </div>
  );
}
