import { useState, useRef, useCallback, useEffect } from "react";
import { updateMealItem, submitCorrection } from "../api/meals";

/**
 * ItemWeightEditor — inline portion adjuster for a single scanned item.
 *
 * Why this exists: portion weight is the single largest source of calorie error
 * in photo estimates, and the photo can't supply it. This lets the user correct
 * it in one gesture, which (a) fixes the number they see and (b) feeds the
 * prediction-feedback loop as a labeled correction.
 *
 * Interaction model (best of both worlds):
 *   - While dragging / tapping: macros scale LOCALLY and instantly (linear in
 *     grams), so feedback is immediate with zero network latency.
 *   - On release (debounced): calls /recalculate for authoritative macros
 *     (USDA-accurate, non-linear where relevant) and records the change via
 *     /feedback so the correction loop learns from it.
 *
 * Props:
 *   item            - normalized item ({ id, name, grams, calories, protein, ... })
 *   analysis        - the full normalized analysis (needed by updateMealItem +
 *                     for predictionLogId)
 *   onAnalysisChange(updatedAnalysis) - called with the recalculated analysis
 *                     so the parent can update totals/state
 *   presets         - optional [{label, grams}] portion chips
 */

const DEFAULT_PRESETS = [
  { label: "½ bowl", grams: 200 },
  { label: "1 bowl", grams: 400 },
  { label: "Large", grams: 500 },
];

const MIN_GRAMS = 5;
const MAX_GRAMS = 1000;
const STEP = 5;

// Scale a numeric macro from the original grams to new grams. Guards div-by-zero.
function scaleValue(value, fromGrams, toGrams) {
  if (!fromGrams || fromGrams <= 0) return value ?? 0;
  return Math.round(((value ?? 0) * (toGrams / fromGrams)) * 10) / 10;
}

export default function ItemWeightEditor({
  item,
  analysis,
  onAnalysisChange,
  presets = DEFAULT_PRESETS,
}) {
  // The grams the item currently DISPLAYS (updates live as user adjusts).
  const [grams, setGrams] = useState(item.grams || 100);
  // Baseline for linear scaling + for the correction record. Frozen at the
  // per-item values the backend originally returned.
  const originalRef = useRef({
    grams: item.grams || 100,
    calories: item.calories || 0,
    protein: item.protein || 0,
    carbs: item.carbs || 0,
    fat: item.fat || 0,
    fiber: item.fiber || 0,
    name: item.name,
  });
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef(null);
  const editingRef = useRef(false);

  // If the parent swaps in a freshly recalculated item, resync the baseline
  // (unless the user is mid-drag, to avoid yanking the value under them).
  useEffect(() => {
    if (editingRef.current) return;
    setGrams(item.grams || 100);
    originalRef.current = {
      grams: item.grams || 100,
      calories: item.calories || 0,
      protein: item.protein || 0,
      carbs: item.carbs || 0,
      fat: item.fat || 0,
      fiber: item.fiber || 0,
      name: item.name,
    };
  }, [item.id, item.grams, item.calories, item.protein, item.carbs, item.fat, item.fiber, item.name]);

  // Locally-scaled preview macros for the CURRENT grams value.
  const o = originalRef.current;
  const preview = {
    calories: scaleValue(o.calories, o.grams, grams),
    protein: scaleValue(o.protein, o.grams, grams),
    carbs: scaleValue(o.carbs, o.grams, grams),
    fat: scaleValue(o.fat, o.grams, grams),
    fiber: scaleValue(o.fiber, o.grams, grams),
  };

  const commit = useCallback(
    async (finalGrams) => {
      // Nothing meaningful changed.
      if (finalGrams === o.grams) return;
      setSaving(true);
      try {
        // 1) Authoritative recalculation across the whole meal.
        const updated = await updateMealItem(
          analysis.id,
          item.id,
          { grams: finalGrams },
          analysis
        );
        if (updated) onAnalysisChange(updated);

        // 2) Record the correction so the feedback loop learns (best-effort).
        if (analysis.predictionLogId) {
          submitCorrection(analysis.predictionLogId, [
            {
              original_name: o.name,
              original_weight_grams: o.grams,
              original_calories: o.calories,
              original_protein: o.protein,
              original_carbs: o.carbs,
              original_fat: o.fat,
              original_fiber: o.fiber,
              corrected_name: o.name,
              corrected_weight_grams: finalGrams,
              corrected_calories: preview.calories,
              corrected_protein: preview.protein,
              corrected_carbs: preview.carbs,
              corrected_fat: preview.fat,
              corrected_fiber: preview.fiber,
              correction_type: "weight",
            },
          ]).catch(() => {
            /* non-fatal: the recalc already succeeded and is what the user sees */
          });
        }
      } finally {
        setSaving(false);
        editingRef.current = false;
      }
    },
    [analysis, item.id, o, preview.calories, preview.protein, preview.carbs, preview.fat, preview.fiber, onAnalysisChange]
  );

  const scheduleCommit = useCallback(
    (finalGrams) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => commit(finalGrams), 450);
    },
    [commit]
  );

  const changeGrams = (next) => {
    editingRef.current = true;
    const clamped = Math.min(MAX_GRAMS, Math.max(MIN_GRAMS, Math.round(next)));
    setGrams(clamped);
    scheduleCommit(clamped);
  };

  return (
    <div className="iwe">
      <div className="iwe__row">
        <div className="iwe__grams">
          <button
            type="button"
            className="iwe__step"
            aria-label={`Decrease ${item.name} weight`}
            onClick={() => changeGrams(grams - STEP)}
            disabled={grams <= MIN_GRAMS}
          >
            −
          </button>

          <div className="iwe__readout">
            <input
              type="number"
              inputMode="numeric"
              className="iwe__input"
              value={grams}
              min={MIN_GRAMS}
              max={MAX_GRAMS}
              aria-label={`${item.name} weight in grams`}
              onChange={(e) => changeGrams(Number(e.target.value) || MIN_GRAMS)}
            />
            <span className="iwe__unit">g</span>
          </div>

          <button
            type="button"
            className="iwe__step"
            aria-label={`Increase ${item.name} weight`}
            onClick={() => changeGrams(grams + STEP)}
            disabled={grams >= MAX_GRAMS}
          >
            +
          </button>
        </div>

        <div className="iwe__cals" aria-live="polite">
          <span className="iwe__cal-num">{Math.round(preview.calories)}</span>
          <span className="iwe__cal-unit">kcal</span>
          {saving && <span className="iwe__dot" aria-label="Saving" />}
        </div>
      </div>

      <input
        type="range"
        className="iwe__slider"
        min={MIN_GRAMS}
        max={MAX_GRAMS}
        step={STEP}
        value={grams}
        aria-label={`${item.name} portion size`}
        onChange={(e) => changeGrams(Number(e.target.value))}
      />

      <div className="iwe__presets">
        {presets.map((p) => (
          <button
            type="button"
            key={p.label}
            className={`iwe__chip${Math.abs(grams - p.grams) < STEP ? " iwe__chip--active" : ""}`}
            onClick={() => changeGrams(p.grams)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="iwe__macros">
        <span><b>{preview.protein}</b>g protein</span>
        <span><b>{preview.carbs}</b>g carbs</span>
        <span><b>{preview.fat}</b>g fat</span>
      </div>

      <style>{`
        .iwe { padding: 12px 14px 14px; }
        .iwe__row {
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px; margin-bottom: 10px;
        }
        .iwe__grams { display: flex; align-items: center; gap: 8px; }
        .iwe__step {
          width: 34px; height: 34px; border-radius: 12px; border: none;
          background: #fdeef0; color: #e05a6b; font-size: 20px; font-weight: 600;
          line-height: 1; cursor: pointer; display: flex; align-items: center;
          justify-content: center; transition: background .15s, transform .05s;
        }
        .iwe__step:active { transform: scale(0.94); }
        .iwe__step:disabled { opacity: .4; cursor: not-allowed; }
        .iwe__readout {
          display: flex; align-items: baseline; gap: 2px;
          background: #f7f7f9; border-radius: 12px; padding: 4px 10px; min-width: 74px;
          justify-content: center;
        }
        .iwe__input {
          width: 46px; border: none; background: transparent; text-align: right;
          font-size: 17px; font-weight: 700; color: #2b2b31; padding: 0;
          -moz-appearance: textfield;
        }
        .iwe__input::-webkit-outer-spin-button,
        .iwe__input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        .iwe__unit { font-size: 13px; color: #9a9aa2; font-weight: 600; }
        .iwe__cals { display: flex; align-items: baseline; gap: 4px; }
        .iwe__cal-num { font-size: 22px; font-weight: 800; color: #2b2b31; }
        .iwe__cal-unit { font-size: 12px; font-weight: 700; color: #e05a6b; letter-spacing: .02em; }
        .iwe__dot {
          width: 7px; height: 7px; border-radius: 50%; background: #e05a6b;
          margin-left: 4px; animation: iwe-pulse 1s ease-in-out infinite;
        }
        @keyframes iwe-pulse { 0%,100% { opacity: .3 } 50% { opacity: 1 } }
        .iwe__slider {
          width: 100%; margin: 4px 0 12px; accent-color: #e05a6b; height: 4px;
        }
        .iwe__presets { display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; }
        .iwe__chip {
          border: 1px solid #ece9ef; background: #fff; color: #6a6a73;
          border-radius: 999px; padding: 6px 14px; font-size: 13px; font-weight: 600;
          cursor: pointer; transition: all .15s;
        }
        .iwe__chip--active { background: #fdeef0; color: #e05a6b; border-color: #f7d4da; }
        .iwe__macros {
          display: flex; gap: 16px; font-size: 13px; color: #7a7a82;
        }
        .iwe__macros b { color: #2b2b31; font-weight: 700; }
        @media (prefers-reduced-motion: reduce) {
          .iwe__step, .iwe__chip { transition: none; }
          .iwe__dot { animation: none; }
        }
      `}</style>
    </div>
  );
}
