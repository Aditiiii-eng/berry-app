import React, { useState } from "react";
import { ArrowLeft, Check, ChevronRight, Timer, Flame, Award, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore, SCREENS } from "../store/useStore";

export function CookingMode() {
  const { tempRecipe, setScreen } = useStore();
  const [step, setStep] = useState(0);
  
  // Default steps if none provided
  const steps = [
    "Prepare all ingredients and wash vegetables thoroughly.",
    "Heat the pan over medium heat and add a base oil or ghee.",
    "Add the primary protein or vegetables and sauté until tender.",
    "Incorporate spices and sauces, mixing well to distribute flavor.",
    "Simmer for 5-10 minutes until the desired consistency is reached.",
    "Garnish with fresh herbs and serve immediately."
  ];

  const isLast = step === steps.length - 1;

  const nextStep = () => {
    if (!isLast) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 0) setStep(step - 1);
  };

  const finish = () => {
    setScreen(SCREENS.HOME);
  };

  return (
    <div className="flex h-full flex-col bg-slate-900 text-white">
      {/* Header */}
      <div className="flex items-center justify-between p-6 pt-12">
        <button 
          onClick={() => setScreen(SCREENS.RECIPE_DETAIL)}
          className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="text-center">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Step {step + 1} of {steps.length}</p>
          <h2 className="text-sm font-bold text-white truncate w-40">{tempRecipe?.title || "Cooking"}</h2>
        </div>
        <button 
          onClick={() => setScreen(SCREENS.HOME)}
          className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white"
        >
          <X size={20} />
        </button>
      </div>

      {/* Progress Bar */}
      <div className="flex px-6 gap-1">
        {steps.map((_, i) => (
          <div 
            key={i} 
            className={`h-1 flex-1 rounded-full transition-all duration-500 ${
              i <= step ? "bg-rose-500" : "bg-white/10"
            }`}
          />
        ))}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-10 text-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            <div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-rose-500/20 text-5xl">
              {step === 0 ? "🔪" : step === steps.length - 1 ? "🍽️" : "🍳"}
            </div>
            
            <h1 className="text-2xl font-black leading-tight">
              {steps[step]}
            </h1>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer Actions */}
      <div className="p-8 pb-12 flex gap-4">
        {step > 0 && (
          <button 
            onClick={prevStep}
            className="flex-1 rounded-[24px] bg-white/10 py-5 text-sm font-black uppercase tracking-widest"
          >
            Back
          </button>
        )}
        
        <button 
          onClick={isLast ? finish : nextStep}
          className={`flex-[2] flex items-center justify-center gap-3 rounded-[24px] py-5 text-sm font-black uppercase tracking-widest transition-all ${
            isLast ? "bg-green-500" : "bg-rose-500"
          } shadow-xl shadow-rose-900/20 active:scale-95`}
        >
          {isLast ? "Finish Cooking" : "Next Step"}
          {isLast ? <Award size={18} /> : <ChevronRight size={18} />}
        </button>
      </div>

      {/* Stats Overlay */}
      <div className="flex items-center justify-center gap-8 pb-8 text-slate-500">
        <div className="flex items-center gap-2">
          <Timer size={14} />
          <span className="text-[11px] font-black">{tempRecipe?.time || "15m"}</span>
        </div>
        <div className="flex items-center gap-2">
          <Flame size={14} />
          <span className="text-[11px] font-black">{tempRecipe?.calories || "350"} kcal</span>
        </div>
      </div>
    </div>
  );
}
