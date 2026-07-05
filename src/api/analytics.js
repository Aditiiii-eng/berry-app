import { request, USE_MOCK_API, wait } from "./client";

const mockDaily = {
  calories: 1850,
  protein: 120,
  carbs: 200,
  fat: 60,
  fiber: 25,
  meals: 4,
  by_type: {
    Breakfast: { calories: 400, protein: 20, carbs: 50, fat: 10, fiber: 5, count: 1 },
    Lunch: { calories: 600, protein: 40, carbs: 60, fat: 20, fiber: 8, count: 1 },
    Dinner: { calories: 700, protein: 50, carbs: 70, fat: 25, fiber: 10, count: 1 },
    Snack: { calories: 150, protein: 10, carbs: 20, fat: 5, fiber: 2, count: 1 },
  },
  top_foods: [
    { name: "Grilled Chicken Breast", calories: 330, weight_grams: 200 },
    { name: "Brown Rice", calories: 216, weight_grams: 195 },
    { name: "Avocado", calories: 160, weight_grams: 100 },
    { name: "Oatmeal", calories: 150, weight_grams: 40 },
    { name: "Almonds", calories: 110, weight_grams: 20 }
  ]
};

const mockWeekly = {
  days: [
    { date: "2023-10-01", calories: 1900, protein: 130, carbs: 210, fat: 65, goal: 2000 },
    { date: "2023-10-02", calories: 2100, protein: 140, carbs: 230, fat: 70, goal: 2000 },
    { date: "2023-10-03", calories: 1800, protein: 120, carbs: 190, fat: 60, goal: 2000 },
    { date: "2023-10-04", calories: 2050, protein: 135, carbs: 220, fat: 68, goal: 2000 },
    { date: "2023-10-05", calories: 1950, protein: 125, carbs: 205, fat: 62, goal: 2000 },
    { date: "2023-10-06", calories: 2200, protein: 150, carbs: 250, fat: 75, goal: 2000 },
    { date: "2023-10-07", calories: 1850, protein: 120, carbs: 200, fat: 60, goal: 2000 }
  ],
  averages: {
    calories: 1978,
    protein: 131,
    carbs: 215,
    fat: 65
  }
};

export async function getDailyAnalytics(date = null) {
  if (USE_MOCK_API) {
    await wait(200);
    return mockDaily;
  }
  const url = date ? `/analytics/daily?date=${date}` : `/analytics/daily`;
  return request(url);
}

export async function getWeeklyAnalytics() {
  if (USE_MOCK_API) {
    await wait(200);
    return mockWeekly;
  }
  return request("/analytics/weekly");
}

export async function getMonthlyAnalytics() {
  if (USE_MOCK_API) {
    await wait(200);
    return { days: mockWeekly.days }; // Mocking with weekly structure
  }
  return request("/analytics/monthly");
}
