import { request, USE_MOCK_API, wait, API_BASE } from "./client";
import { normalizeDashboard } from "./dashboard";

const mockAnalysis = {
  id: "analysis_1",
  confidence: 78,
  calories: 340,
  mealImageEmoji: "🥗",
  macros: { protein: 49.3, carbs: 12, fat: 10.5, fiber: 4.3 },
  items: [
    { id: "item_1", name: "Baby Spinach", grams: 100, calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4, fiber: 2.2, emoji: "🥬" },
    { id: "item_2", name: "Grilled Chicken", grams: 150, calories: 248, protein: 46, carbs: 0, fat: 5.4, fiber: 0, emoji: "🍗" },
  ],
  nutritionFacts: {
    Fiber: "4.3g",
    GlycemicLoad: "8.2",
    GI: "42",
  },
};

function normalizeBrainResponse(raw) {
  return {
    id: `analysis_${Date.now()}`,
    predictionLogId: raw.prediction_log_id || null,
    confidence: raw.confidence_score ?? 0,
    calories: raw.total_calories ?? 0,
    mealImageEmoji: raw.mealImageEmoji || "🥗",
    imageUrl: (() => {
      if (!raw.imageUrl) return null;
      return raw.imageUrl.startsWith("http")
        ? raw.imageUrl
        : `${API_BASE}${raw.imageUrl}`;
    })(),
    macros: {
      protein: raw.total_protein ?? 0,
      carbs: raw.total_carbs ?? 0,
      fat: raw.total_fat ?? 0,
      fiber: raw.total_fiber ?? 0,
    },
    items: (raw.items || []).map((item, index) => ({
      id: item.id || `item_${index + 1}`,
      name: item.name,
      grams: item.weight_grams,
      servingCount: item.serving_count,
      servingUnit: item.serving_unit,
      calories: item.calories,
      protein: item.protein,
      carbs: item.carbs,
      fat: item.fat,
      fiber: item.fiber,
      giScore: item.gi_score,
      glycemicLoad: item.glycemic_load,
      usdaMatched: item.usda_matched,
      usdaName: item.usda_name,
      allNutrients: item.all_nutrients,
      emoji: "🍽️",
    })),
    nutritionFacts: {
      Fiber: `${raw.total_fiber ?? 0}g`,
      GlycemicLoad: String(raw.total_glycemic_load ?? 0),
      GI: String(raw.overall_gi_score ?? 0),
    },
    raw,
  };
}

export async function analyzeMeal(file) {
  if (USE_MOCK_API) {
    await wait(2500);
    return mockAnalysis;
  }

  const body = new FormData();
  body.append("file", file);

  let raw;
  try {
    raw = await request("/scan-food", { method: "POST", body });
  } catch (err) {
    // Backend couldn't identify any food/drink even after the broadened retry.
    if (err?.status === 422 || /COULD_NOT_IDENTIFY/.test(err?.message || "")) {
      return { needsManual: true, items: [], calories: 0 };
    }
    throw err;
  }

  return normalizeBrainResponse(raw);
}

export async function logTextMeal(text) {
  const raw = await request("/log-text", {
    method: "POST",
    body: JSON.stringify({ text }),
  });

  return normalizeBrainResponse(raw);
}

export async function logBarcodeMeal(barcode) {
  const raw = await request("/log-barcode", {
    method: "POST",
    body: JSON.stringify({ barcode }),
  });

  return normalizeBrainResponse(raw);
}

export async function decodeBarcodeImage(file) {
  const body = new FormData();
  body.append("file", file);

  const data = await request("/decode-barcode-image", {
    method: "POST",
    body,
  });

  return data.barcode; // returns the decoded barcode string
}

export async function updateMealItem(analysisId, itemId, patch, currentAnalysis) {
  if (USE_MOCK_API) {
    await wait(350);
    return null;
  }

  const updatedItems = currentAnalysis.items.map((item) =>
    item.id === itemId ? { ...item, grams: patch.grams } : item
  );

  const raw = await request("/recalculate", {
    method: "POST",
    body: JSON.stringify({
      items: updatedItems.map((item) => ({
        name: item.name,
        weight_grams: item.grams,
      })),
    }),
  });

  return normalizeBrainResponse(raw);
}

export async function submitCorrection(predictionLogId, corrections) {
  if (USE_MOCK_API) return { ok: true };
  return request("/feedback", {
    method: "POST",
    body: JSON.stringify({
      prediction_log_id: predictionLogId,
      corrections,
    }),
  });
}

export async function saveMeal(analysis) {
  const result = await request("/meals", {
    method: "POST",
    body: JSON.stringify({
      ...analysis,
      total_calories: analysis.calories,
      total_protein: analysis.macros?.protein,
      total_carbs: analysis.macros?.carbs,
      total_fat: analysis.macros?.fat,
      total_fiber: analysis.macros?.fiber,
      imageUrl: analysis.imageUrl,
      depth_path: analysis.depth_path,
      capture_source: analysis.capture_source,
    }),
  });
  if (result.dashboard) result.dashboard = normalizeDashboard(result.dashboard);
  return result;
}

export async function deleteMeal(mealId) {
  const numericId = String(mealId).replace("meal_", "");
  const result = await request(`/meals/${numericId}`, { method: "DELETE" });
  if (result.dashboard) result.dashboard = normalizeDashboard(result.dashboard);
  return result;
}

export async function getMeal(mealId) {
  const numericId = String(mealId).replace("meal_", "");
  const raw = await request(`/meals/${numericId}`);
  const normalized = normalizeBrainResponse(raw);
  normalized.isSaved = true;
  return normalized;
}

export async function getMealPlan() {
  return request("/meal-plan");
}

export async function getGroceryList() {
  return request("/meals/grocery-list");
}

export async function logSuggestedMeal(title) {
  const result = await request("/meals/suggested", {
    method: "POST",
    body: JSON.stringify({ title }),
  });
  if (result.dashboard) result.dashboard = normalizeDashboard(result.dashboard);
  return result;
}

export async function optimizeGroceryList(items) {
  return request("/meals/grocery-optimize", {
    method: "POST",
    body: JSON.stringify({ items }),
  });
}

export async function getRecipesFromGrocery(items) {
  return request("/meals/grocery-recipes", {
    method: "POST",
    body: JSON.stringify({ items }),
  });
}
