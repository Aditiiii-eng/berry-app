import { apiFetch } from "./client";

export async function saveOnboardingProfile(profile) {
  return apiFetch("/profile/onboarding", {
    method: "POST",
    body: JSON.stringify(profile),
  });
}

export async function updateProfile(profile) {
  return apiFetch("/profile", {
    method: "PATCH",
    body: JSON.stringify(profile),
  });
}

export async function updateGoals(goals) {
  return apiFetch("/profile/goals", {
    method: "PUT",
    body: JSON.stringify(goals),
  });
}

export async function updateName(name) {
  return apiFetch("/profile/name", {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
}

export async function changePassword(current_password, new_password) {
  return apiFetch("/profile/change-password", {
    method: "POST",
    body: JSON.stringify({ current_password, new_password }),
  });
}

export async function deleteAccount(password) {
  return apiFetch("/profile/account", {
    method: "DELETE",
    body: JSON.stringify({ 
      password, 
      confirm: "DELETE MY ACCOUNT" 
    }),
  });
}

export async function getUserGoals() {
  return apiFetch("/profile/goals");
}

export async function getProfile() {
  return apiFetch("/profile");
}
