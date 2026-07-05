import React, { useState } from "react";
import { Flame } from "lucide-react";
import { useStore, SCREENS } from "../../store/useStore";
import { loginUser, registerUser, googleLogin } from "../../api/auth";
import { useGoogleLogin } from "@react-oauth/google";
import toast from 'react-hot-toast';

export function LoginScreen() {
  const { setToken, setUser, setScreen, hydrated, setUserProfile, setUserGoals } = useStore();
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  if (!hydrated) return null;

  const handleGoogleLogin = useGoogleLogin({
    flow: "implicit",
    scope: "openid email profile",
    onSuccess: async (tokenResponse) => {
      console.log("[DEBUG] Google tokenResponse:", JSON.stringify(tokenResponse));
      setLoading(true);
      try {
        if (!tokenResponse.access_token) {
          throw new Error("No access token returned from Google");
        }
        // Store temp token so apiFetch can use it if needed
        localStorage.setItem("berry_token", tokenResponse.access_token);

        // Pass access token to backend — backend calls Google userinfo to verify
        const data = await googleLogin({
          token: tokenResponse.access_token,
          email: "",
          name: "",
        });

        // Replace with our JWT
        localStorage.setItem("berry_token", data.token);
        setToken(data.token);
        setUser(data.user);
        if (data.profile) setUserProfile(data.profile);
        if (data.goals) setUserGoals(data.goals);
        setScreen(SCREENS.HOME);
      } catch (e) {
        localStorage.removeItem("berry_token");
        console.error("Google login error:", e);
        toast.error("Google Login failed: " + e.message);
      } finally {
        setLoading(false);
      }
    },
    onError: (err) => {
      console.error("Google OAuth error:", err);
      toast.error("Google Login Failed — try email login instead.");
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return toast.error("Please enter email and password");
    if (isRegister && !name) return toast.error("Please enter your name");

    setLoading(true);
    try {
      let data;
      if (isRegister) {
        data = await registerUser({ name, email, password });
      } else {
        data = await loginUser({ email, password });
      }
      setToken(data.token);
      setUser(data.user);
      if (data.profile) setUserProfile(data.profile);
      if (data.goals) setUserGoals(data.goals);
      setScreen(SCREENS.HOME);
    } catch (e) {
      toast.error(e.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex h-full flex-col bg-gradient-to-b from-[#fff4f6] via-white to-[#fff8f9] p-6">
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <div className="mb-6 grid h-20 w-20 place-items-center rounded-3xl bg-[#ff3b66] shadow-xl shadow-red-200">
          <Flame size={40} className="text-white" />
        </div>
        <h1 className="text-2xl font-black text-slate-900">Welcome to Berry</h1>
        <p className="mt-2 text-xs text-slate-500">Your AI-powered nutrition companion.</p>

        <form onSubmit={handleSubmit} className="mt-8 w-full space-y-3">
          {isRegister && (
            <input
              type="text"
              placeholder="Your Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:border-[#ff3b66]"
            />
          )}
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:border-[#ff3b66]"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:border-[#ff3b66]"
          />

          <button
            type="submit"
            disabled={loading}
            className="mt-4 w-full rounded-full bg-[#ff3b66] py-4 font-black text-white shadow-lg shadow-red-200 transition-transform active:scale-95 disabled:opacity-70"
          >
            {loading ? "Please wait..." : (isRegister ? "Create Account" : "Sign In")}
          </button>
        </form>

        <div className="my-6 flex w-full items-center gap-4 px-2">
          <div className="h-[1px] flex-1 bg-slate-100" />
          <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">or continue with</span>
          <div className="h-[1px] flex-1 bg-slate-100" />
        </div>

        <button
          onClick={handleGoogleLogin}
          className="flex w-full items-center justify-center gap-3 rounded-full border-2 border-slate-100 bg-white py-4 font-bold text-slate-600 transition-transform active:scale-95 shadow-sm"
        >
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4" />
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853" />
            <path d="M3.964 10.71a4.41 4.41 0 0 1 0-2.82V5.557H.957a8.993 8.993 0 0 0 0 6.885l3.007-2.332z" fill="#FBBC05" />
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.933l3.007 2.332c.708-2.127 2.692-3.685 5.036-3.685z" fill="#EA4335" />
          </svg>
          Google
        </button>

        <button
          type="button"
          onClick={() => setIsRegister(!isRegister)}
          className="mt-6 text-xs font-bold text-slate-500"
        >
          {isRegister ? "Already have an account? Sign in" : "Need an account? Create one"}
        </button>
      </div>
    </div>
  );
}
