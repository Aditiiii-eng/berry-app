import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  CalendarDays,
  Bell,
  Utensils,
  ShoppingBasket,
  Plus,
  Sun,
  Moon,
  Trash2,
  Loader2,
} from "lucide-react";
import { useStore, SCREENS } from "../store/useStore";
import { deleteMeal, getMealPlan, getGroceryList, logSuggestedMeal } from "../api/meals";
import { LoadingOverlay, DayStrip } from "../components/ui";
import { berry } from "../components/BerryUI";
import { ProtectedImage } from "../components/ProtectedImage";
import toast from 'react-hot-toast';

const fallbackDays = [
  ["MON", 12],
  ["TUE", 13],
  ["WED", 14],
  ["THU", 15],
  ["FRI", 16],
  ["SAT", 17],
];

const meals = {
  Breakfast: [
    {
      title: "Avocado Toast",
      img: "🥑",
      kcal: 320,
      pro: "12g Pro",
      tags: ["EASY", "5 MIN"],
    },
  ],
  Lunch: [
    {
      title: "Quinoa Buddha Bowl",
      img: "🥗",
      kcal: 450,
      pro: "18g Pro",
      tags: ["MED", "15 MIN"],
    },
    {
      title: "Caesar Salad",
      img: "🥗",
      kcal: 380,
      pro: "24g Pro",
      tags: ["EASY", "10 MIN"],
    },
  ],
  Dinner: [
    {
      title: "Seared Salmon",
      img: "🐟",
      kcal: 540,
      pro: "42g Pro",
      tags: ["HARD", "25 MIN"],
    },
  ],
};

const foodFallbackImages = {
  "Avocado Toast":
    "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=500&q=80",
  "Quinoa Buddha Bowl":
    "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=500&q=80",
  "Caesar Salad":
    "https://images.unsplash.com/photo-1546793665-c74683f339c1?auto=format&fit=crop&w=500&q=80",
  "Seared Salmon":
    "https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=500&q=80",
};

function MealCard({ meal, onDelete, isDeleting }) {
  const image = meal.imageUrl || foodFallbackImages[meal.title];

  return (
    <div className="overflow-hidden rounded-[24px] bg-white shadow-[0_14px_35px_rgba(244,63,94,0.08)]">
      <div className="h-28 bg-slate-100 relative">
        <ProtectedImage 
          src={image} 
          alt={meal.title} 
          className="h-full w-full object-cover" 
          fallback={
            <div className="grid h-full w-full place-items-center bg-rose-50 text-5xl">
              {meal.img || "🍽️"}
            </div>
          } 
        />

        {onDelete && meal.id && String(meal.id).startsWith("meal_") && (
          <button
            onClick={() => onDelete(meal.id)}
            disabled={isDeleting}
            className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-white/95 text-rose-400 shadow-sm active:scale-90 disabled:opacity-40"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>

      <div className="p-4">
        <h3 className="text-[15px] font-black leading-5 text-slate-900">
          {meal.title}
        </h3>

        <div className="mt-3 flex flex-wrap gap-2">
          {(meal.tags || []).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-black uppercase text-slate-400"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="mt-4 flex justify-between text-[11px] font-black">
          <span className="text-slate-400">{meal.kcal || 350} kcal</span>
          <span className="text-rose-500">{meal.pro || "18g Pro"}</span>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ icon, title, action }) {
  return (
    <div className="mt-7 mb-4 flex items-center justify-between">
      <h2 className="flex items-center gap-2 text-[16px] font-black text-slate-900">
        <span>{icon}</span>
        {title}
      </h2>

      {action && (
        <button className="text-[10px] font-black uppercase tracking-wide text-rose-500">
          {action}
        </button>
      )}
    </div>
  );
}

function AddItemCard() {
  return (
    <button className="grid min-h-[222px] place-items-center rounded-[22px] border-2 border-dashed border-slate-200 bg-white/50 active:scale-[0.99] transition-transform">
      <div className="text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-slate-300">
          <Plus size={25} />
        </div>
        <p className="mt-3 text-[11px] font-black uppercase tracking-wide text-slate-400">
          Add Item
        </p>
      </div>
    </button>
  );
}

function MealSection({ title, icon, items, onDelete, deleting }) {
  return (
    <section className="mt-7">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-[20px] font-black tracking-[-0.03em] text-slate-900">
          {icon}
          {title}
        </h2>
        <button className="text-[11px] font-black uppercase tracking-wide text-rose-500">
          Replace ↻
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {items.map((meal) => (
          <MealCard
            key={meal.id || meal.title}
            meal={meal}
            onDelete={onDelete}
            isDeleting={deleting === meal.id}
          />
        ))}
        {items.length < 2 && <AddItemCard />}
      </div>
    </section>
  );
}

function MacroPill({ label, value }) {
  return (
    <div className="rounded-[19px] bg-white px-2 py-3 text-center shadow-[0_12px_28px_rgba(244,63,94,0.08)]">
      <p className="text-[8px] font-black uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <b className="mt-0.5 block text-[13px] font-black text-slate-900">{value}</b>
    </div>
  );
}

export function MealPlanScreen() {
  const storedMealPlan = useStore((s) => s.mealPlan);
  const storedDashboard = useStore((s) => s.dashboard);
  const { setDashboard, setMealPlan, setGroceryList, setScreen } = useStore();
  const [deleting, setDeleting] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAddSuggested = async () => {
    try {
      const result = await logSuggestedMeal("Grilled Salmon Bowl");
      if (result.dashboard) setDashboard(result.dashboard);
      if (result.mealPlan) setMealPlan(result.mealPlan);
      toast.success("✨ Grilled Salmon Bowl has been added to your Dinner plan!");
    } catch (err) {
      toast.error("Failed to add suggested meal: " + err.message);
    }
  };

  const handleGenerateGrocery = async () => {
    setGenerating(true);
    try {
      const result = await getGroceryList();
      const items = result.grocery_list || [];
      
      // Save to store
      setGroceryList(items.map(i => ({ ...i, completed: false })));
      
      // Navigate to Grocery Screen
      setScreen(SCREENS.GROCERY);
    } catch (err) {
      toast.error("Failed to generate grocery list: " + err.message);
    } finally {
      setGenerating(false);
    }
  };

  const loaded = useRef(false);
  useEffect(() => {
    let alive = true;
    async function loadMealPlan() {
      setLoading(true);
      try {
        const plan = await getMealPlan();
        if (alive) {
          setMealPlan(plan);
          loaded.current = true;
        }
      } catch (err) {
        console.error("Failed to load meal plan", err);
      } finally {
        if (alive) setLoading(false);
      }
    }
    if (!storedMealPlan && !loaded.current) loadMealPlan();
    return () => {
      alive = false;
    };
  }, [storedMealPlan, setMealPlan]);

  const days = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + i - 2);
      return [
        d.toLocaleDateString(undefined, { weekday: "short" }).toUpperCase(),
        d.getDate(),
      ];
    });
  }, []);

  const DEFAULT_GOALS = {
    calories: 2200,
    protein: 150,
    carbs: 250,
    fats: 70,
  };

  const { userGoals } = useStore();
  const GOALS = userGoals
    ? { ...DEFAULT_GOALS, ...userGoals, fats: userGoals.fat ?? DEFAULT_GOALS.fats }
    : DEFAULT_GOALS;

  const s1 = storedDashboard?.slide1;
  const calConsumed = s1?.caloriesConsumed ?? 0;
  const proteinConsumed = s1?.intake?.protein ?? 0;
  const carbsConsumed = s1?.intake?.carbs ?? 0;
  const fatsConsumed = s1?.intake?.fat ?? 0;

  const calPct = Math.min(100, Math.round((calConsumed / GOALS.calories) * 100));
  const calBalance = calConsumed - GOALS.calories;

  async function handleDeleteMeal(mealId) {
    if (!mealId || !String(mealId).startsWith("meal_")) {
      toast.error("This is a suggested meal — only logged meals can be removed.");
      return;
    }

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

  const normalizeMeal = (m) => ({
    id: m.id || m.title,
    title: m.title,
    img: m.imageEmoji || "🍛",
    imageUrl: m.imageUrl || null,
    kcal: Math.round(m.calories || 0),
    pro: m.protein ? `${Math.round(m.protein)}g Pro` : "— Pro",
    tags: ["AI LOG", m.fat ? `${Math.round(m.fat)}g Fat` : ""],
  });

  const hasFetched = storedMealPlan !== null;
  const breakfast = hasFetched
    ? (storedMealPlan.breakfast || []).map(normalizeMeal)
    : meals.Breakfast;
  const lunch = hasFetched
    ? (storedMealPlan.lunch || []).map(normalizeMeal)
    : meals.Lunch;
  const dinner = hasFetched
    ? (storedMealPlan.dinner || []).map(normalizeMeal)
    : meals.Dinner;

  const weekLabel = useMemo(() => {
    const today = new Date();
    const month = today.toLocaleDateString("en-US", { month: "short" });
    const currentDays = days || fallbackDays;
    const first = currentDays[0]?.[1];
    const last = currentDays[currentDays.length - 1]?.[1];
    return `Week of ${month} ${first} - ${last}`;
  }, [days]);

  return (
    <div className={berry.screen}>
      <LoadingOverlay loading={loading} />
      
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-full bg-rose-100 text-rose-500">
            <Utensils size={20} />
          </div>

          <div>
            <h1 className={berry.title}>Meal Plan</h1>
            <p className={berry.subtitle}>{weekLabel}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button className="grid h-10 w-10 place-items-center rounded-full bg-white text-slate-500 shadow-sm">
            <CalendarDays size={17} />
          </button>

          <button className="grid h-10 w-10 place-items-center rounded-full bg-white text-slate-500 shadow-sm">
            <Bell size={17} />
          </button>
        </div>
      </header>

      <DayStrip />

      {/* Smart suggestion */}
      <section className="mt-8 overflow-hidden rounded-[25px] border border-rose-100 bg-rose-50/80 shadow-[0_16px_40px_rgba(244,63,94,0.08)]">
        <div className="flex min-h-[158px]">
          <div className="flex-1 px-5 py-5">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-rose-500">
              ⚡ Smart Suggestion
            </p>
            <h2 className="mt-2 text-[18px] font-black leading-6 tracking-[-0.02em] text-slate-900">
              Need 40g more Protein?
            </h2>
            <p className="mt-2 text-[13px] font-semibold leading-[18px] text-slate-500">
              Try the Grilled Salmon Bowl for your dinner to hit your daily goal.
            </p>
            <button 
              onClick={handleAddSuggested}
              className="mt-4 rounded-full bg-rose-500 px-5 py-3 text-[11px] font-black uppercase tracking-wide text-white shadow-lg shadow-rose-200 transition-transform active:scale-95"
            >
              Add to Plan →
            </button>
          </div>
        </div>
      </section>

      <SectionHeader icon="☀️" title="Breakfast" action="Replace ↻" />
      <div className="space-y-4">
        {breakfast.map((m, i) => (
          <MealCard key={i} meal={m} onDelete={handleDeleteMeal} isDeleting={!!deleting} />
        ))}
        {breakfast.length === 0 && (
          <div className={berry.dashedButton}>No breakfast logged</div>
        )}
      </div>

      <SectionHeader icon="☀️" title="Lunch" action="Replace ↻" />
      <div className="space-y-4">
        {lunch.map((m, i) => (
          <MealCard key={i} meal={m} onDelete={handleDeleteMeal} isDeleting={!!deleting} />
        ))}
        {lunch.length === 0 && (
          <div className={berry.dashedButton}>No lunch logged</div>
        )}
      </div>

      <SectionHeader icon="🌙" title="Dinner" action="Replace ↻" />
      <div className="space-y-4">
        {dinner.map((m, i) => (
          <MealCard key={i} meal={m} onDelete={handleDeleteMeal} isDeleting={!!deleting} />
        ))}
        {dinner.length === 0 && (
          <div className={berry.dashedButton}>No dinner logged</div>
        )}
      </div>
    </div>
  );
}
