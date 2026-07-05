import { apiFetch, setToken, clearToken } from "./client";

export async function registerUser({ name, email, password }) {
  const data = await apiFetch("/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });

  setToken(data.token);
  return data;
}

export async function loginUser({ email, password }) {
  const data = await apiFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  setToken(data.token);
  return data;
}

export async function googleLogin(payload) {
  const data = await apiFetch("/auth/google", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  setToken(data.token);
  return data;
}

export async function getCurrentUser() {
  return apiFetch("/auth/me");
}

export function logoutUser() {
  clearToken();
}
