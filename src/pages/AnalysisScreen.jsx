import React, { useState } from "react";
import { ArrowLeft, Save, Edit3, ChevronDown, CheckCircle2 } from "lucide-react";
import { useStore } from "../store/useStore";
import { analyzeMeal, logBarcodeMeal, updateMealItem, submitCorrection, saveMeal, getMeal } from "../api/meals";
import { ProtectedImage } from "../components/ProtectedImage";
import { LoadingOverlay } from "../components/ui";
import { EditItemModal } from "../components/EditItemModal";
import ItemWeightEditor from "../components/ItemWeightEditor";
import toast from 'react-hot-toast';

function MacroCard({ label, value, color, subValue }) {
  const colors = {
    rose: "bg-rose-50 text-rose-600 border-rose-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
    blue: "bg-blue-50 text-blue-600 border-blue-100",
  };

  return (
    <div className={`rounded-3xl border p-4 text-center ${colors[color]}`}>
      <p className="text-[10px] font-bold uppercase tracking-wider opacity-60">{label}</p>
      <h3 className="mt-1 text-xl font-black">{value}</h3>
      <p className="text-[10px] font-medium opacity-60">{subValue}</p>
    </div>
  );
}

function num(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function getItemGrams(item) {
  return num(item.grams ?? item.weight_grams ?? item.weightGrams, 0);
}

function getServingCount(item) {
  return item.servingCount ?? item.serving_count ?? null;
}

function getServingUnit(item) {
  return item.servingUnit ?? item.serving_unit ?? null;
}

function getTotals(analysis) {
  const items = analysis?.items || [];
  const macros = analysis?.macros || {};
  return {
    calories: num(analysis?.calories ?? analysis?.total_calories, items.reduce((s, i) => s + num(i.calories), 0)),
    protein: num(macros.protein ?? analysis?.total_protein, items.reduce((s, i) => s + num(i.protein), 0)),
    carbs: num(macros.carbs ?? analysis?.total_carbs, items.reduce((s, i) => s + num(i.carbs), 0)),
    fat: num(macros.fat ?? analysis?.total_fat, items.reduce((s, i) => s + num(i.fat), 0)),
    fiber: num(macros.fiber ?? analysis?.total_fiber, items.reduce((s, i) => s + num(i.fiber), 0)),
    confidence: num(analysis?.confidence ?? analysis?.confidence_score, 0),
  };
}

function buildNutritionFacts(analysis, totals) {
  return analysis?.nutritionFacts || {
    Protein: `${Math.round(totals.protein)}g`,
    Carbs: `${Math.round(totals.carbs)}g`,
    Fat: `${Math.round(totals.fat)}g`,
    Fiber: `${Math.round(totals.fiber)}g`,
    "GI Score": analysis?.overall_gi_score ?? analysis?.overallGiScore ?? "—",
  };
}

function getMacroSubValue(macro, value) {
  if (macro === "protein") {
    if (value >= 30) return "High";
    if (value >= 15) return "Moderate";
    return "Low";
  }
  if (macro === "carbs") {
    if (value >= 60) return "High";
    if (value >= 30) return "Moderate";
    return "Low";
  }
  if (macro === "fat") {
    if (value >= 25) return "High";
    if (value >= 10) return "Moderate";
    return "Low";
  }
  return "Moderate";
}

export function AnalysisScreen() {
  const {
    setScreen,
    analysis,
    setAnalysis,
    setDashboard,
    setProgress,
    setMealPlan
  } = useStore();

  const [saving, setSaving] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [showFullFacts, setShowFullFacts] = useState(false);

  async function handleSaveItem(updatedItem) {
    try {
      const originalItem = analysis.items.find(i => i.id === updatedItem.id);
      
      const updatedAnalysis = await updateMealItem(
        analysis.id,
        updatedItem.id,
        { grams: getItemGrams(updatedItem), weight_grams: getItemGrams(updatedItem) },
        analysis
      );
      
      // Submit correction for training loop
      let feedbackError = null;
      if (analysis.predictionLogId && originalItem) {
        try {
          await submitCorrection(analysis.predictionLogId, [{
            original_name: originalItem.name,
            original_weight_grams: getItemGrams(originalItem),
            original_calories: num(originalItem.calories),
            original_protein: num(originalItem.protein),
            original_carbs: num(originalItem.carbs),
            original_fat: num(originalItem.fat),
            original_fiber: num(originalItem.fiber),
            corrected_name: updatedItem.name,
            corrected_weight_grams: getItemGrams(updatedItem),
            corrected_calories: num(updatedItem.calories),
            corrected_protein: num(updatedItem.protein),
            corrected_carbs: num(updatedItem.carbs),
            corrected_fat: num(updatedItem.fat),
            corrected_fiber: num(updatedItem.fiber),
          }]);
        } catch (err) {
          console.error("Failed to submit correction:", err);
          feedbackError = "Warning: Failed to log this correction to the training dataset. Your edit was saved locally.";
        }
      }
      
      setAnalysis(updatedAnalysis || {
        ...analysis,
        items: analysis.items.map((x) => (x.id === updatedItem.id ? updatedItem : x)),
      });
      
      if (feedbackError) {
        toast.error(feedbackError);
      }
    } catch (e) {
      toast.error(e.message || "Failed to update item");
    }
  }

  async function handleSaveMeal() {
    setSaving(true);
    try {
      const payload = {
        ...analysis,
        confidence_score: analysis.confidence_score ?? analysis.confidence,
        total_calories: analysis.total_calories ?? analysis.calories,
        total_protein: analysis.total_protein ?? analysis.macros?.protein,
        total_carbs: analysis.total_carbs ?? analysis.macros?.carbs,
        total_fat: analysis.total_fat ?? analysis.macros?.fat,
        total_fiber: analysis.total_fiber ?? analysis.macros?.fiber,
        prediction_log_id: analysis.predictionLogId,
        items: (analysis.items || []).map((item) => ({
          ...item,
          weight_grams: getItemGrams(item),
          serving_count: getServingCount(item),
          serving_unit: getServingUnit(item),
        })),
      };

      const result = await saveMeal(payload);

      // Sync global state
      if (result.dashboard) setDashboard(result.dashboard);
      if (result.progress) setProgress(result.progress);
      if (result.mealPlan) setMealPlan(result.mealPlan);
      if (result.meal) setAnalysis({ ...analysis, ...result.meal, isSaved: true });

      setScreen("home");
    } catch (e) {
      toast.error(e.message || "Failed to save meal");
    } finally {
      setSaving(false);
    }
  }

  if (!analysis) return null;

  if (analysis.needsManual) {
    return (
      <div className="relative flex-1 overflow-hidden bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white rounded-[34px] p-8 shadow-[0_16px_40px_rgba(0,0,0,0.04)] max-w-sm w-full border border-slate-100">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-rose-50 mb-4">
            <span className="text-3xl">🤔</span>
          </div>
          <h2 className="text-xl font-black text-slate-800 mb-2">We couldn't read this one</h2>
          <p className="text-sm font-medium text-slate-500 mb-8 leading-relaxed">
            The photo wasn't clear enough to identify the food or drink. You can try another photo.
          </p>
          <button 
            onClick={() => setScreen("scan")}
            className="w-full rounded-full bg-rose-500 py-4 text-sm font-black text-white shadow-lg shadow-rose-200 active:scale-95 transition-transform"
          >
            Try another photo
          </button>
        </div>
      </div>
    );
  }

  const totals = getTotals(analysis);
  const nutritionFacts = buildNutritionFacts(analysis, totals);

  return (
    <div className="relative flex-1 overflow-hidden bg-white">
      <LoadingOverlay loading={saving} />

      <div className="h-full overflow-y-auto px-5 pb-32">
        {/* Sticky Header */}
        <div className="sticky top-0 z-20 -mx-5 flex items-center justify-between bg-white/90 px-5 py-4 backdrop-blur-md">
          <button
            onClick={() => setScreen(analysis.isSaved ? "home" : "scan")}
            className="grid h-10 w-10 place-items-center rounded-full bg-slate-50 shadow-sm"
          >
            <ArrowLeft size={18} className="text-slate-600" />
          </button>
          <h2 className="text-base font-black text-slate-800">{analysis.isSaved ? "Meal Details" : "Scan Result"}</h2>
          {analysis.isSaved ? (
            <div className="w-10" />
          ) : (
            <button
              onClick={handleSaveMeal}
              className="grid h-10 w-10 place-items-center rounded-full bg-rose-500 text-white shadow-lg shadow-rose-200"
            >
              <Save size={18} />
            </button>
          )}
        </div>

        {/* Hero Image Card */}
        <div className="mt-2 overflow-hidden rounded-[40px] bg-white p-3 shadow-[0_16px_40px_rgba(0,0,0,0.04)]">
          <div className="relative flex h-56 flex-col items-center justify-center overflow-hidden rounded-[32px] bg-gradient-to-br from-rose-50 via-white to-blue-50 shadow-inner">
            <ProtectedImage
              src={analysis.imageUrl}
              alt="Scanned meal"
              className="absolute inset-0 h-full w-full object-cover"
              fallback={<span className="text-8xl">{analysis.mealImageEmoji || "🍽️"}</span>}
            />
            <div className="absolute bottom-3 flex items-center gap-1.5 rounded-full bg-white/80 px-4 py-1.5 backdrop-blur-sm shadow-sm">
              <CheckCircle2 size={14} className="text-emerald-500" />
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-tight">Verified by Berry AI</span>
            </div>
          </div>
        </div>

        {/* AI Analysis Card */}
        <div className="mt-6 rounded-[34px] bg-white p-6 shadow-[0_16px_40px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-slate-800">AI Analysis</h3>
              <p className="text-xs font-medium text-slate-400">Confidence: {totals.confidence}%</p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-rose-50 grid place-items-center">
              <span className="text-lg font-black text-rose-500">{analysis.items.length}</span>
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-slate-500">
            {analysis.analysis_summary || "We've detected several key ingredients in your meal. You can edit the portion sizes below for higher accuracy."}
          </p>
        </div>

        {/* Food Items List */}
        <div className="mt-6 space-y-3">
          {analysis.items.map((item) => (
            <div key={item.id} className="group relative flex flex-col gap-2 rounded-[28px] bg-white p-4 shadow-[0_8px_20px_rgba(0,0,0,0.02)] transition-all">
              <div className="flex items-center gap-4 cursor-pointer" onClick={() => setEditingItem(editingItem?.id === item.id ? null : item)}>
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-50 text-xl transition-colors group-hover:bg-rose-50">
                  {item.emoji || "🍽️"}
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-slate-800">{item.name}</h4>
                  <p className="text-[11px] font-medium text-slate-400">
                    {getServingCount(item) && getServingUnit(item)
                      ? `${getServingCount(item)} ${getServingUnit(item)} / ${getItemGrams(item)}g`
                      : `${getItemGrams(item)}g`} • {Math.round(num(item.calories))} kcal
                  </p>
                </div>
                {!analysis.isSaved && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingItem(editingItem?.id === item.id ? null : item);
                    }}
                    className="grid h-8 w-8 place-items-center rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100 transition-colors"
                  >
                    <Edit3 size={14} />
                  </button>
                )}
              </div>
              {editingItem?.id === item.id && (
                <ItemWeightEditor
                  item={item}
                  analysis={analysis}
                  onAnalysisChange={setAnalysis}
                />
              )}
            </div>
          ))}
        </div>

        {/* Macro Breakdown Grid */}
        <div className="mt-8 grid grid-cols-3 gap-3">
          <MacroCard label="Protein" value={`${Math.round(totals.protein)}g`} subValue={getMacroSubValue("protein", totals.protein)} color="emerald" />
          <MacroCard label="Carbs" value={`${Math.round(totals.carbs)}g`} subValue={getMacroSubValue("carbs", totals.carbs)} color="amber" />
          <MacroCard label="Fat" value={`${Math.round(totals.fat)}g`} subValue={getMacroSubValue("fat", totals.fat)} color="blue" />
        </div>

        {/* Full Nutrition Facts Accordion */}
        <div className="mt-6 overflow-hidden rounded-[34px] bg-white shadow-[0_16px_40px_rgba(0,0,0,0.04)]">
          <button
            onClick={() => setShowFullFacts(!showFullFacts)}
            className="flex w-full items-center justify-between p-6"
          >
            <span className="text-sm font-black text-slate-800">Full Nutrition Facts</span>
            <ChevronDown size={20} className={`text-slate-400 transition-transform ${showFullFacts ? "rotate-180" : ""}`} />
          </button>

          {showFullFacts && (
            <div className="px-6 pb-6 pt-0 space-y-4">
              <div className="h-[1px] w-full bg-slate-50" />
              {Object.entries(nutritionFacts).map(([k, v]) => (
                <div key={k} className="flex justify-between text-xs">
                  <span className="font-bold text-slate-400">{k}</span>
                  <b className="text-slate-700">{v}</b>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Total Calories Block */}
        <div className="mt-8 text-center pb-12">
          <p className="text-xs font-bold uppercase tracking-[2px] text-slate-400">Total Calories</p>
          <div className="mt-2 flex items-baseline justify-center gap-1">
            <h2 className="text-5xl font-black text-slate-900">{Math.round(totals.calories)}</h2>
            <span className="text-lg font-black text-rose-500 uppercase">kcal</span>
          </div>
        </div>
      </div>

      {/* Bottom Actions */}
      {!analysis.isSaved && (
        <div className="absolute bottom-5 left-5 right-5 z-50 flex gap-3">
          <button
            onClick={() => setScreen("scan")}
            className="flex-1 rounded-full bg-white py-4 text-sm font-black text-slate-700 shadow-lg active:scale-95 transition-transform"
          >
            Recalculate
          </button>

          <button
            onClick={handleSaveMeal}
            disabled={saving}
            className="flex-1 rounded-full bg-red-500 py-4 text-sm font-black text-white shadow-lg shadow-red-200 disabled:opacity-50 active:scale-95 transition-transform"
          >
            Add to My Log
          </button>
        </div>
      )}


    </div>
  );
}
