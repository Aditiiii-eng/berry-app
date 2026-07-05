import { request, USE_MOCK_API, wait } from "./client";

const mockProgress = {
  stepsToday: 0,
  caloriesBurned: 0,
  water: { currentMl: 0, goalMl: 2500 },
  detoxHabit: {
    id: "detox",
    title: "Daily Detox",
    completedDays: [false, false, false, false, false, false, false],
  },
  weeklyBars: [0, 0, 0, 0, 0, 0, 0],
};

export async function getProgress() {
  try {
    // Aggregated steps/cals for today
    const data = await request("/progress/steps/today");
    return { 
      ...mockProgress, 
      ...data, 
      stepsToday: data.steps || 0 
    };
  } catch {
    await wait(250);
    return mockProgress;
  }
}

export async function logWater(amount_ml) {
  if (USE_MOCK_API) {
    await wait(150);
    return { ok: true };
  }
  return request("/progress/water", {
    method: "POST",
    body: JSON.stringify({ amount_ml }),
  });
}

export async function deleteWaterLog(logId) {
  if (USE_MOCK_API) {
    await wait(150);
    return { ok: true };
  }
  return request(`/progress/water/${logId}`, {
    method: "DELETE",
  });
}

export async function logHabit(habitId) {
  if (USE_MOCK_API) {
    await wait(150);
    return { ok: true };
  }
  // habitId is ignored by backend for now as we only have DetoxLog
  return request("/progress/detox", {
    method: "POST",
  });
}

export async function logSteps(steps, calories_burned = 0, distance_km = 0) {
    return request("/progress/steps", {
        method: "POST",
        body: JSON.stringify({ steps, calories_burned, distance_km })
    });
}

export async function getStepsToday() {
    return request("/progress/steps/today");
}

export async function getStreak() {
    return request("/progress/streak");
}

export async function getWeightHistory(days = 30) {
    return request(`/progress/weight?days=${days}`);
}

export async function getWaterHistory(date = null) {
  const url = date ? `/progress/water?date=${date}` : `/progress/water`;
  return request(url);
}

export async function getWaterWeekly() {
  try {
    return await request("/progress/water/weekly");
  } catch {
    // Fall back gracefully if endpoint not yet added
    return { days: [], streak: 0 };
  }
}

