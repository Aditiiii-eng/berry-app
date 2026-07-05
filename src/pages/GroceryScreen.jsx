import React, { useState, useEffect, useMemo } from "react";
import { ShoppingBasket, Trash2, Plus, CheckCircle2, Circle, Sparkles, Loader2, ChefHat, Timer, Gauge } from "lucide-react";
import { useStore, SCREENS } from "../store/useStore";
import { optimizeGroceryList, getRecipesFromGrocery } from "../api/meals";
import toast from 'react-hot-toast';

const COMMON_ITEMS = [
  { name: "Milk", emoji: "🥛" }, { name: "Eggs", emoji: "🥚" }, { name: "Bread", emoji: "🍞" }, 
  { name: "Chicken Breast", emoji: "🍗" }, { name: "Salmon", emoji: "🐟" }, { name: "Broccoli", emoji: "🥦" }, 
  { name: "Spinach", emoji: "🥬" }, { name: "Avocado", emoji: "🥑" }, { name: "Greek Yogurt", emoji: "🍦" }, 
  { name: "Oats", emoji: "🥣" }, { name: "Blueberries", emoji: "🫐" }, { name: "Banana", emoji: "🍌" }, 
  { name: "Sweet Potato", emoji: "🍠" }, { name: "Quinoa", emoji: "🍚" }, { name: "Tofu", emoji: "⬜" },
  { name: "Paneer", emoji: "🧀" }, { name: "Basmati Rice", emoji: "🍚" }, { name: "Moong Dal", emoji: "🍲" }, 
  { name: "Masoor Dal", emoji: "🍲" }, { name: "Turmeric", emoji: "🧂" }, { name: "Cumin Seeds", emoji: "🧂" }, 
  { name: "Ginger", emoji: "🫚" }, { name: "Garlic", emoji: "🧄" }, { name: "Onions", emoji: "🧅" }, 
  { name: "Tomatoes", emoji: "🍅" }, { name: "Coriander", emoji: "🌿" }, { name: "Ghee", emoji: "🍯" }, 
  { name: "Coconut Oil", emoji: "🥥" }, { name: "Garam Masala", emoji: "🌶️" }, { name: "Red Chili Powder", emoji: "🌶️" }, 
  { name: "Green Chilies", emoji: "🌶️" }, { name: "Black Pepper", emoji: "🧂" }, { name: "Cardamom", emoji: "🟢" }, 
  { name: "Cloves", emoji: "🤎" }, { name: "Cinnamon", emoji: "🪵" }, { name: "Mustard Seeds", emoji: "⚫" }, 
  { name: "Curry Leaves", emoji: "🍃" }, { name: "Fenugreek (Methi)", emoji: "🌿" }, { name: "Sriracha", emoji: "🔥" }, 
  { name: "Jalapeños", emoji: "🌶️" }, { name: "Peri Peri Seasoning", emoji: "🔥" }, { name: "Kimchi", emoji: "🥬" }, 
  { name: "Chili Flakes", emoji: "🌶️" }, { name: "Aloo (Potato)", emoji: "🥔" }, { name: "Bhindi (Okra)", emoji: "🥒" }, 
  { name: "Baingan (Eggplant)", emoji: "🍆" }, { name: "Gobi (Cauliflower)", emoji: "🥦" }, { name: "Matar (Peas)", emoji: "🫛" }, 
  { name: "Poha", emoji: "🌾" }, { name: "Rava (Semolina)", emoji: "🌾" }, { name: "Rajma", emoji: "🫘" }, 
  { name: "Chana (Chickpeas)", emoji: "🫘" }, { name: "Papad", emoji: "🟡" }, { name: "Jaggery", emoji: "🤎" }, 
  { name: "Amchur", emoji: "🍋" }, { name: "Hing (Asafoetida)", emoji: "🧂" }, { name: "Sambar Powder", emoji: "🍲" }, 
  { name: "Idli Batter", emoji: "⚪" }, { name: "Dosa Batter", emoji: "⚪" }, { name: "Curd (Dahi)", emoji: "🥣" }, 
  { name: "Chaas (Buttermilk)", emoji: "🥛" }, { name: "Makhana", emoji: "🍿" }
];

export function GroceryScreen() {
  const { groceryList, setGroceryList, setScreen, setTempRecipe, setSelectedRecipeId } = useStore();
  const [inputValue, setInputValue] = useState("");
  const [optimizing, setOptimizing] = useState(false);
  const [loadingRecipes, setLoadingRecipes] = useState(false);
  const [suggestedRecipes, setSuggestedRecipes] = useState([]);

  const suggestions = useMemo(() => {
    const query = inputValue.trim().toLowerCase();
    if (!query) return [];
    
    const queryWords = query.split(/\s+/).filter(Boolean);
    
    return COMMON_ITEMS.filter(item => {
      const itemName = item.name.toLowerCase();
      // Check if ALL query words are found in the item name
      const matchesAll = queryWords.every(word => itemName.includes(word));
      // Check if already in list
      const notInList = !groceryList.some(g => g.name.toLowerCase() === itemName);
      return matchesAll && notInList;
    }).slice(0, 5);
  }, [inputValue, groceryList]);

  const toggleItem = (index) => {
    const newList = [...groceryList];
    newList[index].completed = !newList[index].completed;
    setGroceryList(newList);
  };

  const removeItem = (index) => {
    const newList = groceryList.filter((_, i) => i !== index);
    setGroceryList(newList);
  };

  const addItem = (item = null) => {
    const name = item?.name || inputValue;
    const emoji = item?.emoji || "🛒";
    if (!name.trim()) return;
    setGroceryList([...groceryList, { name, emoji, amount: "As needed", completed: false }]);
    setInputValue("");
  };

  const handleOptimize = async () => {
    if (groceryList.length === 0) return;
    setOptimizing(true);
    try {
      const result = await optimizeGroceryList(groceryList);
      const optimized = (result.items || []).map(item => ({
        ...item,
        completed: false
      }));
      if (optimized.length > 0) {
        setGroceryList(optimized);
      }
    } catch (err) {
      toast.error("AI Optimization failed: " + err.message);
    } finally {
      setOptimizing(false);
    }
  };

  const fetchRecipes = async () => {
    if (groceryList.length < 2) return;
    setLoadingRecipes(true);
    try {
      const result = await getRecipesFromGrocery(groceryList);
      setSuggestedRecipes(result.recipes || []);
    } catch (err) {
      console.error("Recipe suggestion failed", err);
    } finally {
      setLoadingRecipes(false);
    }
  };

  // Fetch recipes whenever list changes and has enough items
  useEffect(() => {
    if (groceryList.length >= 2 && suggestedRecipes.length === 0) {
      fetchRecipes();
    }
  }, [groceryList.length]);

  return (
    <div className="relative flex-1 overflow-y-auto scrollbar-hide bg-gradient-to-b from-[#f8fafc] to-white px-6 pb-36 pt-4">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-rose-100 text-rose-500">
            <ShoppingBasket size={25} />
          </div>
          <div>
            <h1 className="text-[22px] font-black leading-6 tracking-[-0.03em] text-slate-900">
              Grocery List
            </h1>
            <p className="mt-0.5 text-[12px] font-bold text-slate-400">
              {groceryList.length} items to buy
            </p>
          </div>
        </div>

        {groceryList.length > 0 && (
          <button
            onClick={handleOptimize}
            disabled={optimizing}
            className="flex items-center gap-2 rounded-full bg-indigo-500 px-4 py-2 text-[11px] font-black uppercase tracking-wide text-white shadow-lg shadow-indigo-200 active:scale-95 disabled:opacity-50"
          >
            {optimizing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            AI Optimize
          </button>
        )}
      </header>

      {/* Smart Aggregation Info */}
      <div className="mt-6 flex items-start gap-3 rounded-[24px] bg-indigo-50/50 p-4 ring-1 ring-indigo-100/50">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-indigo-100 text-indigo-500">
          <CheckCircle2 size={18} />
        </div>
        <div>
          <h4 className="text-[13px] font-black text-indigo-900">Smart Aggregation</h4>
          <p className="mt-0.5 text-[11px] font-bold leading-relaxed text-indigo-400/80">
            Your list is automatically synchronized with your Meal Plan and recent recipe scans.
          </p>
        </div>
      </div>

      <div className="mt-8 relative">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Add something else..."
            className="flex-1 rounded-[18px] border-2 border-slate-100 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-rose-200"
            onKeyDown={(e) => e.key === "Enter" && addItem()}
          />
          <button
            onClick={() => addItem()}
            className="grid h-[48px] w-[48px] place-items-center rounded-[18px] bg-rose-500 text-white shadow-lg shadow-rose-200 active:scale-95"
          >
            <Plus size={22} />
          </button>
        </div>

        {/* Suggestions Dropdown */}
        {suggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-[56px] z-30 overflow-hidden rounded-[22px] bg-white shadow-xl ring-1 ring-slate-100 animate-in fade-in slide-in-from-top-2 duration-200">
            {suggestions.map((item) => (
              <button
                key={item.name}
                onClick={() => addItem(item)}
                className="flex w-full items-center gap-3 px-5 py-4 text-left text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 active:bg-slate-100 border-b border-slate-50 last:border-0"
              >
                <span className="text-lg">{item.emoji}</span>
                {item.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quick Add Indian Staples */}
      <section className="mt-8">
        <h3 className="text-[12px] font-black uppercase tracking-wider text-slate-400">
          Quick Add Indian Staples
        </h3>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {[
            { name: "Paneer", emoji: "🧀" },
            { name: "Moong Dal", emoji: "🍲" },
            { name: "Basmati Rice", emoji: "🍚" },
            { name: "Ghee", emoji: "🍯" },
            { name: "Turmeric", emoji: "🧂" },
            { name: "Atta", emoji: "🌾" },
          ].map((staple) => (
            <button
              key={staple.name}
              onClick={() => addItem(staple)}
              className="flex items-center gap-2 shrink-0 rounded-full bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm ring-1 ring-slate-100 active:scale-95"
            >
              <span>{staple.emoji}</span>
              {staple.name}
            </button>
          ))}
        </div>
      </section>

      {/* AI Recipe Suggestions */}
      {groceryList.length >= 2 && (
        <section className="mt-8">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-black text-slate-800">
              <ChefHat size={18} className="text-rose-500" />
              What you can make:
            </h3>
            <button 
              onClick={fetchRecipes}
              className="text-[10px] font-black uppercase tracking-wider text-indigo-500 active:opacity-50"
            >
              Refresh
            </button>
          </div>
          
          <div className="mt-4 flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {loadingRecipes ? (
              [1, 2, 3].map(i => (
                <div key={i} className="h-[120px] w-[180px] shrink-0 animate-pulse rounded-[22px] bg-slate-50" />
              ))
            ) : suggestedRecipes.length > 0 ? (
              suggestedRecipes.map((recipe, i) => (
                <div 
                  key={i}
                  onClick={() => {
                    setTempRecipe({
                      ...recipe,
                      emoji: "🍳",
                      ingredients: groceryList.map(i => i.name),
                      calories: 350, // Default estimate
                    });
                    setSelectedRecipeId(null); // Clear ID to prefer tempRecipe
                    setScreen(SCREENS.RECIPE_DETAIL);
                  }}
                  className="w-[200px] shrink-0 rounded-[22px] bg-white p-4 shadow-sm ring-1 ring-slate-100 transition-all active:scale-[0.98] cursor-pointer"
                >
                  <h4 className="line-clamp-1 text-[13px] font-black text-slate-800">{recipe.title}</h4>
                  <p className="mt-1 line-clamp-2 text-[10px] font-bold leading-relaxed text-slate-400">
                    {recipe.description}
                  </p>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex items-center gap-1 text-[9px] font-black text-indigo-500">
                      <Timer size={10} /> {recipe.time}
                    </div>
                    <div className="flex items-center gap-1 text-[9px] font-black text-rose-500">
                      <Gauge size={10} /> {recipe.difficulty}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-[10px] font-bold text-slate-300 italic">No recipes found. Add more items!</p>
            )}
          </div>
        </section>
      )}

      <section className="mt-8">
        <h3 className="text-sm font-black text-slate-800">Shopping List</h3>
        {groceryList.length === 0 ? (
          <div className="mt-10 text-center">
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-slate-50 text-slate-200">
              <ShoppingBasket size={40} />
            </div>
            <p className="mt-4 text-sm font-bold text-slate-400">
              Your grocery list is empty.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {groceryList.map((item, index) => (
              <div
                key={index}
                className={`group flex items-center gap-3 rounded-[22px] bg-white p-4 shadow-sm transition-all ${
                  item.completed ? "opacity-50" : ""
                }`}
              >
                <button
                  onClick={() => toggleItem(index)}
                  className={`shrink-0 ${item.completed ? "text-green-500" : "text-slate-200"}`}
                >
                  {item.completed ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                </button>
                
                <div className="flex-1 min-w-0" onClick={() => toggleItem(index)}>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{item.emoji || "🛒"}</span>
                    <p className={`truncate text-sm font-black text-slate-800 ${item.completed ? "line-through" : ""}`}>
                      {item.name}
                    </p>
                    {item.category && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[8px] font-black uppercase text-slate-400">
                        {item.category}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] font-bold text-slate-400">
                    {item.amount} {item.tip && <span className="ml-2 font-medium text-indigo-400 italic">• AI Tip: {item.tip}</span>}
                  </p>
                </div>

                <button
                  onClick={() => removeItem(index)}
                  className="grid h-8 w-8 place-items-center rounded-full bg-rose-50 text-rose-400 opacity-0 group-hover:opacity-100 active:scale-90 transition-opacity"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {groceryList.length > 0 && (
        <button
          onClick={() => setGroceryList([])}
          className="mt-8 w-full rounded-full py-3 text-xs font-black uppercase tracking-widest text-rose-400"
        >
          Clear All Items
        </button>
      )}
    </div>
  );
}
