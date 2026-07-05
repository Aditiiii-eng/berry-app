import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const DEFAULT_DENSITY_G_PER_CUP = {
  rice: 175,
  sambar: 245,
  chutney: 240,
  dal: 240,
  curry: 240,
  milk: 245,
  water: 240,
};

function gramsFrom(value, unit, item) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  if (unit === "g") return n;
  if (unit === "oz") return n * 28.3495;
  if (unit === "cup") {
    const name = String(item?.name || "").toLowerCase();
    const density = Object.entries(DEFAULT_DENSITY_G_PER_CUP).find(([key]) => name.includes(key))?.[1] || 240;
    return n * density;
  }
  return n;
}

export function EditItemModal({ isOpen, onClose, item, onSave }) {
  const [amount, setAmount] = useState("");
  const [unit, setUnit] = useState("g");

  useEffect(() => {
    if (item) {
      setAmount(String(item.grams || ""));
      setUnit("g");
    }
  }, [item]);

  const estimatedGrams = Math.round(gramsFrom(amount, unit, item));

  const handleSave = () => {
    if (!estimatedGrams || estimatedGrams <= 0) return;
    onSave({ ...item, grams: estimatedGrams, servingUnit: unit, servingCount: Number(amount) });
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && item && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="relative rounded-t-[32px] bg-white p-6 shadow-2xl"
          >
            <div className="mx-auto mb-6 h-1.5 w-12 rounded-full bg-slate-200" />
            <div className="mb-6 flex items-center gap-4">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-emerald-100 text-2xl">
                {item.emoji}
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900">{item.name}</h3>
                <p className="text-sm text-slate-500">Edit portion size</p>
              </div>
            </div>
            <div className="mb-6 space-y-3">
              <label className="block text-xs font-bold text-slate-500">
                PORTION
              </label>
              <div className="flex items-center gap-2 rounded-[20px] bg-slate-50 p-3 ring-1 ring-slate-200 focus-within:ring-2 focus-within:ring-red-400">
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-transparent text-2xl font-black text-slate-800 outline-none"
                  autoFocus
                />
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="rounded-xl bg-white px-2 py-2 text-sm font-black text-slate-500 outline-none"
                >
                  <option value="g">g</option>
                  <option value="oz">oz</option>
                  <option value="cup">cups</option>
                </select>
              </div>
              <p className="text-xs font-bold text-slate-400">
                Berry will save this as ~{estimatedGrams || 0}g for nutrition recalculation.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 rounded-full bg-slate-100 py-4 text-sm font-bold text-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!estimatedGrams || estimatedGrams <= 0}
                className="flex-1 rounded-full bg-red-500 py-4 text-sm font-black text-white shadow-lg shadow-red-200 disabled:opacity-40"
              >
                Save Changes
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
