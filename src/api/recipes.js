import { request, USE_MOCK_API, wait } from "./client";

const mockRecipes = [
  { id: "recipe_1", title: "Berry Protein Smoothie", time: "7 min", calories: 320, difficulty: "Easy", emoji: "🥤" },
  { id: "recipe_2", title: "Paneer Tikka Salad", time: "15 min", calories: 380, difficulty: "Medium", emoji: "🧀" },
  { id: "recipe_3", title: "Dal Tadka Bowl", time: "25 min", calories: 410, difficulty: "Easy", emoji: "🍲" },
  { id: "recipe_4", title: "Egg Avocado Toast", time: "12 min", calories: 380, difficulty: "Easy", emoji: "🥑" },
  { id: "recipe_5", title: "Grilled Salmon Salad", time: "20 min", calories: 450, difficulty: "Easy", emoji: "🥗" },
  { id: "recipe_6", title: "Healthy Veg Bowl", time: "15 min", calories: 410, difficulty: "Medium", emoji: "🥦" },
];

export async function getRecipes() {
  // No backend /recipes endpoint exists yet; serve curated recipes locally.
  await wait(250);
  return mockRecipes;
}

export async function getRecipe(id) {
  // No backend /recipes/{id} endpoint exists yet; serve locally.
  await wait(250);
  const recipe = mockRecipes.find((r) => r.id === id) || mockRecipes[0];
  return {
    ...recipe,
    ingredients: ["Raspberries", "Greek Yogurt", "Protein Powder", "Banana", "Milk"],
    instructions: [
      "Add ingredients to blender",
      "Blend until smooth",
      "Pour into glass",
      "Serve chilled",
    ],
    protein: 28,
    carbs: 32,
    fat: 9,
  };
}
