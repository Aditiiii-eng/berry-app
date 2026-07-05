import { request, USE_MOCK_API, wait, API_BASE } from "./client";

const mockDashboard = {
  user: { name: "Berry", streak: 3 },
  slide1: {
    caloriesLeft: 1050,
    macros: { proteinLeft: 131, carbsLeft: 65, fatsLeft: 29 },
    recentMeals: [
      {
        id: "meal_1",
        title: "Grilled Salmon Salad",
        calories: 450,
        time: "20 min",
        imageEmoji: "🥗",
      },
    ],
  },
  slide2: {
    micronutrients: { fiberLeft: 18, sugarLeft: 32, sodiumLeft: 1.8 },
    healthScore: 7,
    healthMessage: "Carbs and fat are on track. You're low in calories and protein, which can slow weight loss.",
    recentMeals: [
      {
        id: "meal_1",
        title: "Grilled Salmon Salad",
        calories: 450,
        time: "20 min",
        imageEmoji: "🥗",
      },
    ],
  },
  slide3: {
    water: { currentMl: 1200, goalMl: 2500 },
    detoxHabit: {
      id: "detox",
      title: "Daily Detox",
      completedDays: [true, true, true, true, true, false, false],
    },
  },
};

// Normalize imageUrls in a dashboard object (works for GET, POST /meals, DELETE /meals)
export function normalizeDashboard(data) {
  if (!data) return data;
  const normalizeMeals = (meals) =>
    meals?.map(m => {
      if (!m.imageUrl) return { ...m, imageUrl: null };
      const url = m.imageUrl.startsWith("http")
        ? m.imageUrl
        : `${API_BASE}${m.imageUrl}`;
      return { ...m, imageUrl: url };
    }) || [];

  if (data.slide1) data.slide1.recentMeals = normalizeMeals(data.slide1.recentMeals);
  if (data.slide2) data.slide2.recentMeals = normalizeMeals(data.slide2.recentMeals);
  return data;
}

export async function getDashboard() {
  if (USE_MOCK_API) {
    await wait(350);
    return mockDashboard;
  }
  const data = await request("/dashboard");
  return normalizeDashboard(data);
}
