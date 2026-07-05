import React, { useMemo, useState } from "react";
import { ChevronLeft, Loader2, Sparkles, Pencil, Check } from "lucide-react";
import { useStore, SCREENS } from "../store/useStore";
import { saveOnboardingProfile } from "../api/profile";
import toast from 'react-hot-toast';

// ─── Step count (added: ExerciseFrequency, TargetWeight) ─────────────────────
const TOTAL_STEPS = 9;

const activityOptions = [
  { id: "sedentary",  title: "Sedentary",        subtitle: "Desk job, little or no exercise",       emoji: "🪑" },
  { id: "light",      title: "Lightly Active",    subtitle: "Light exercise 1–3 days/week",          emoji: "🚶" },
  { id: "moderate",   title: "Moderately Active", subtitle: "Moderate exercise 3–5 days/week",       emoji: "🏃" },
  { id: "active",     title: "Very Active",       subtitle: "Hard exercise 6–7 days/week",           emoji: "💪" },
  { id: "athlete",    title: "Athlete",           subtitle: "Training twice a day or physical job",  emoji: "🏆" },
];

const exerciseFrequencyOptions = [
  { id: "never",     title: "I don't exercise",   subtitle: "That's okay — we'll start gentle",     emoji: "😌" },
  { id: "1-2",       title: "1–2× a week",         subtitle: "Weekend warrior",                       emoji: "🎯" },
  { id: "3-4",       title: "3–4× a week",         subtitle: "Building a solid habit",               emoji: "🔥" },
  { id: "5-6",       title: "5–6× a week",         subtitle: "Serious about fitness",                emoji: "⚡" },
  { id: "daily",     title: "Every day",           subtitle: "You're dedicated",                     emoji: "🏅" },
];

const goalOptions = [
  { id: "lose",     title: "🔥 Lose Weight",    subtitle: "Calorie deficit, more protein" },
  { id: "maintain", title: "⚖️ Maintain Weight", subtitle: "Balanced maintenance calories" },
  { id: "gain",     title: "💪 Gain Muscle",     subtitle: "Calorie surplus, high protein" },
];

const dietOptions = [
  { id: "none",        title: "No Preference" },
  { id: "vegetarian",  title: "Vegetarian" },
  { id: "vegan",       title: "Vegan" },
  { id: "keto",        title: "Keto / Low-Carb" },
  { id: "highprotein", title: "High Protein" },
  { id: "jain",        title: "Jain" },
];

const ACTIVITY_MULTIPLIER = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  athlete: 1.9,
};

function calcGoals(profile) {
  const { gender, weightKg, heightCm, birthYear, activity, goal } = profile;
  const age = birthYear ? new Date().getFullYear() - Number(birthYear) : 25;
  const w = Number(weightKg) || 70;
  const h = Number(heightCm) || 170;

  const bmr =
    gender === "female"
      ? 10 * w + 6.25 * h - 5 * age - 161
      : 10 * w + 6.25 * h - 5 * age + 5;

  const multiplier = ACTIVITY_MULTIPLIER[activity] || 1.55;
  let calories = Math.round(bmr * multiplier);

  if (goal === "lose") calories = Math.round(calories * 0.82);
  if (goal === "gain") calories = Math.round(calories * 1.12);

  let protein = Math.round(w * (goal === "gain" ? 1.8 : goal === "lose" ? 1.6 : 1.2));
  const maxProtein = Math.round((calories * 0.35) / 4);
  if (protein > maxProtein) protein = maxProtein;

  const fat = Math.round((calories * 0.28) / 9);
  const carbs = Math.round((calories - protein * 4 - fat * 9) / 4);
  const fiber = gender === "female" ? 25 : 38;
  const sodium = 2.3;
  const sugar = Math.round((calories * 0.05) / 4);

  return { calories, protein, carbs, fat, fiber, sodium, sugar };
}

function imperialToCm(feet, inches) {
  return Math.round((Number(feet) * 12 + Number(inches)) * 2.54);
}
function lbToKg(lb) {
  return Math.round(Number(lb) * 0.453592);
}
function getMonthNumber(monthName) {
  const index = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December",
  ].indexOf(monthName);
  return index >= 0 ? index + 1 : 1;
}

export function OnboardingScreen() {
  const { setScreen, setUserProfile, setUserGoals } = useStore();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Height / Weight pickers
  const [heightUnit, setHeightUnit] = useState("Imperial");
  const [weightUnit, setWeightUnit] = useState("lb");
  const [feet, setFeet] = useState(5);
  const [inches, setInches] = useState(3);
  const [weightLb, setWeightLb] = useState(116);
  const [heightCmPicker, setHeightCmPicker] = useState(170);
  const [weightKgPicker, setWeightKgPicker] = useState(65);

  // Target weight pickers (separate state)
  const [targetWeightUnit, setTargetWeightUnit] = useState("lb");
  const [targetWeightLb, setTargetWeightLb] = useState(110);
  const [targetWeightKgPicker, setTargetWeightKgPicker] = useState(50);

  // Birthday
  const [birthMonth, setBirthMonth] = useState("November");
  const [birthDay, setBirthDay] = useState(30);
  const [birthYear, setBirthYear] = useState(1999);

  const [profile, setProfile] = useState({
    gender: "female",
    heightCm: imperialToCm(5, 3),
    weightKg: lbToKg(116),
    targetWeightKg: lbToKg(110),
    birthYear: 1999,
    activity: "",
    exerciseFrequency: "",
    goal: "maintain",
    diet: "none",
  });

  const updateProfile = (patch) => setProfile((p) => ({ ...p, ...patch }));
  const autoGoals = useMemo(() => calcGoals(profile), [profile]);
  // customGoals = null means "use auto"; once user edits, holds overrides
  const [customGoals, setCustomGoals] = useState(null);
  const goals = customGoals ?? autoGoals;

  // ── Height / Weight sync helpers ─────────────────────────────────────────
  function syncHeightWeight(
    nextHeightUnit = heightUnit,
    nextWeightUnit = weightUnit,
    nextFeet = feet,
    nextInches = inches,
    nextWeightLb = weightLb,
    nextHeightCm = heightCmPicker,
    nextWeightKg = weightKgPicker
  ) {
    updateProfile({
      heightCm: nextHeightUnit === "Imperial" ? imperialToCm(nextFeet, nextInches) : Number(nextHeightCm),
      weightKg: nextWeightUnit === "lb" ? lbToKg(nextWeightLb) : Number(nextWeightKg),
    });
  }

  function setImperialFeet(v)    { setFeet(v);      syncHeightWeight(heightUnit, weightUnit, v, inches, weightLb, heightCmPicker, weightKgPicker); }
  function setImperialInches(v)  { setInches(v);    syncHeightWeight(heightUnit, weightUnit, feet, v, weightLb, heightCmPicker, weightKgPicker); }
  function setImperialWeight(v)  { setWeightLb(v);  syncHeightWeight(heightUnit, weightUnit, feet, inches, v, heightCmPicker, weightKgPicker); }
  function setMetricHeight(v)    { setHeightCmPicker(v); syncHeightWeight(heightUnit, weightUnit, feet, inches, weightLb, v, weightKgPicker); }
  function setMetricWeight(v)    { setWeightKgPicker(v); syncHeightWeight(heightUnit, weightUnit, feet, inches, weightLb, heightCmPicker, v); }
  function handleHeightUnitChange(u) { setHeightUnit(u); syncHeightWeight(u, weightUnit, feet, inches, weightLb, heightCmPicker, weightKgPicker); }
  function handleWeightUnitChange(u) { setWeightUnit(u); syncHeightWeight(heightUnit, u, feet, inches, weightLb, heightCmPicker, weightKgPicker); }

  // ── Target weight sync helpers ────────────────────────────────────────────
  function syncTargetWeight(unit = targetWeightUnit, lb = targetWeightLb, kg = targetWeightKgPicker) {
    updateProfile({ targetWeightKg: unit === "lb" ? lbToKg(lb) : Number(kg) });
  }
  function handleTargetWeightUnitChange(u) {
    setTargetWeightUnit(u);
    syncTargetWeight(u, targetWeightLb, targetWeightKgPicker);
  }
  function setTargetLb(v)  { setTargetWeightLb(v);      syncTargetWeight(targetWeightUnit, v, targetWeightKgPicker); }
  function setTargetKg(v)  { setTargetWeightKgPicker(v); syncTargetWeight(targetWeightUnit, targetWeightLb, v); }

  // ── Navigation ────────────────────────────────────────────────────────────
  async function next() {
    if (step < TOTAL_STEPS) {
      setStep((s) => s + 1);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        gender: profile.gender,
        birth_year: Number(birthYear),
        birth_month: getMonthNumber(birthMonth),
        birth_day: Number(birthDay),
        height_cm: Number(profile.heightCm),
        weight_kg: Number(profile.weightKg),
        target_weight_kg: Number(profile.targetWeightKg),
        activity_level: profile.activity,
        exercise_frequency: profile.exerciseFrequency,
        goal: profile.goal,
        diet_preference: profile.diet,
        // If user overrode goals, send them as custom_goals so backend respects them
        ...(customGoals ? { custom_goals: customGoals } : {}),
      };

      const result = await saveOnboardingProfile(payload);
      // If user customised goals, inject them over what the backend calculated
      setUserProfile(result.profile);
      setUserGoals(customGoals ? { ...result.goals, ...customGoals } : result.goals);
      setScreen(SCREENS.HOME);
    } catch (e) {
      toast.error("Failed to save profile: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  function back() {
    if (step > 1) setStep((s) => s - 1);
  }

  return (
    <div className="flex h-full flex-col bg-white text-slate-900">
      <Header step={step} total={TOTAL_STEPS} onBack={back} showBack={step > 1} />

      <main className="flex-1 overflow-hidden px-6">
        {step === 1 && (
          <GenderStep value={profile.gender} onChange={(gender) => updateProfile({ gender })} />
        )}
        {step === 2 && (
          <HeightWeightStep
            heightUnit={heightUnit} setHeightUnit={handleHeightUnitChange}
            weightUnit={weightUnit} setWeightUnit={handleWeightUnitChange}
            feet={feet} setFeet={setImperialFeet}
            inches={inches} setInches={setImperialInches}
            weightLb={weightLb} setWeightLb={setImperialWeight}
            heightCm={heightCmPicker} setHeightCm={setMetricHeight}
            weightKg={weightKgPicker} setWeightKg={setMetricWeight}
          />
        )}
        {step === 3 && (
          <BirthdayStep
            month={birthMonth} setMonth={setBirthMonth}
            day={birthDay} setDay={setBirthDay}
            year={birthYear}
            setYear={(v) => { setBirthYear(v); updateProfile({ birthYear: Number(v) }); }}
          />
        )}
        {step === 4 && (
          <ChoiceStep
            title="How active are you?"
            subtitle="This multiplies your BMR into real daily calories."
            options={activityOptions}
            value={profile.activity}
            onChange={(activity) => updateProfile({ activity })}
            showEmoji
          />
        )}
        {step === 5 && (
          <ChoiceStep
            title="How often do you exercise?"
            subtitle="We'll fine-tune your recovery and calorie targets."
            options={exerciseFrequencyOptions}
            value={profile.exerciseFrequency}
            onChange={(exerciseFrequency) => updateProfile({ exerciseFrequency })}
            showEmoji
          />
        )}
        {step === 6 && (
          <ChoiceStep
            title="What's your goal?"
            subtitle="We'll adjust your macros and calories around this."
            options={goalOptions}
            value={profile.goal}
            onChange={(goal) => updateProfile({ goal })}
          />
        )}
        {step === 7 && (
          <TargetWeightStep
            currentWeightKg={profile.weightKg}
            goal={profile.goal}
            weightUnit={targetWeightUnit}
            setWeightUnit={handleTargetWeightUnitChange}
            weightLb={targetWeightLb}
            setWeightLb={setTargetLb}
            weightKg={targetWeightKgPicker}
            setWeightKg={setTargetKg}
          />
        )}
        {step === 8 && (
          <DietPreferenceStep value={profile.diet} onChange={(diet) => updateProfile({ diet })} />
        )}
        {step === 9 && (
          <TargetsSummaryStep
            goals={goals}
            profile={profile}
            onGoalsChange={setCustomGoals}
          />
        )}
      </main>

      <footer className="bg-white px-6 pb-7 pt-4">
        <button
          type="button"
          onClick={next}
          disabled={loading}
          className="flex h-[61px] w-full items-center justify-center rounded-[22px] bg-[#ff3b66] text-[17px] font-extrabold text-white shadow-[0_16px_30px_rgba(255,59,102,0.28)] transition-transform active:scale-[0.99] disabled:opacity-50"
        >
          {loading ? <Loader2 className="animate-spin" /> : step === TOTAL_STEPS ? "✨ Generate My Plan" : "Continue"}
        </button>
      </footer>
    </div>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────
function Header({ step, total, onBack, showBack }) {
  return (
    <header className="flex h-[92px] items-center gap-4 px-6 pt-2">
      <button
        type="button"
        onClick={onBack}
        className={`grid h-[42px] w-[42px] shrink-0 place-items-center rounded-full bg-[#f8f8f9] text-slate-900 shadow-sm transition-opacity ${
          showBack ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        aria-label="Go back"
      >
        <ChevronLeft size={22} />
      </button>

      <div className="flex flex-1 gap-2">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i < step ? "bg-[#ff3b66]" : "bg-[#efeff2]"
            }`}
          />
        ))}
      </div>
    </header>
  );
}

// ─── Step 1: Gender ───────────────────────────────────────────────────────────
function GenderStep({ value, onChange }) {
  const options = [
    { id: "female", title: "Female" },
    { id: "male",   title: "Male" },
    { id: "other",  title: "Other" },
  ];

  return (
    <section className="flex h-full flex-col pt-8">
      <div>
        <h1 className="text-[31px] font-black leading-[39px] tracking-[-0.8px] text-[#171c2a]">
          Choose your<br />Gender
        </h1>
        <p className="mt-4 text-[15px] font-medium leading-6 text-slate-500">
          This will be used to calibrate your custom plan.
        </p>
      </div>
      <div className="mt-11 space-y-4">
        {options.map((option) => {
          const selected = value === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange(option.id)}
              className={`h-[72px] w-full rounded-[22px] text-center text-xl font-extrabold transition-all active:scale-[0.98] ${
                selected
                  ? "border-2 border-[#ff3b66] bg-[#fff1f5] text-[#171c2a] shadow-[0_8px_16px_rgba(255,59,102,0.16)]"
                  : "border-2 border-transparent bg-[#fafafa] text-[#171c2a]"
              }`}
            >
              {option.title}
            </button>
          );
        })}
      </div>
    </section>
  );
}

// ─── Step 2: Height & Weight ───────────────────────────────────────────────────
function HeightWeightStep({
  heightUnit, setHeightUnit, weightUnit, setWeightUnit,
  feet, setFeet, inches, setInches,
  weightLb, setWeightLb, heightCm, setHeightCm, weightKg, setWeightKg,
}) {
  const isHeightImperial = heightUnit === "Imperial";
  const isWeightLb = weightUnit === "lb";

  return (
    <section className="flex h-full flex-col pt-11 text-center">
      <div>
        <h1 className="text-[31px] font-black leading-[39px] tracking-[-0.8px] text-[#171c2a]">
          Height & Weight
        </h1>
        <p className="mx-auto mt-4 max-w-[300px] text-[15px] font-medium leading-6 text-slate-500">
          This will be taken into account when calculating your daily nutrition goals.
        </p>
      </div>

      <div className="mt-12 flex flex-col gap-10">
        {/* HEIGHT */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-black uppercase tracking-widest text-[#171c2a]">Height</h2>
            <UnitToggle
              left="Imperial" right="Metric"
              isLeft={isHeightImperial}
              onLeft={() => setHeightUnit("Imperial")}
              onRight={() => setHeightUnit("Metric")}
              onToggle={() => setHeightUnit(isHeightImperial ? "Metric" : "Imperial")}
            />
          </div>
          {isHeightImperial ? (
            <div className="grid grid-cols-2 gap-4">
              <LabeledInput value={feet} onChange={(e) => setFeet(Number(e.target.value))} label="Feet" max={9} />
              <LabeledInput value={inches} onChange={(e) => setInches(Number(e.target.value))} label="Inches" max={11} />
            </div>
          ) : (
            <LabeledInput value={heightCm} onChange={(e) => setHeightCm(Number(e.target.value))} label="cm" max={300} />
          )}
        </div>

        <div className="h-px w-full bg-slate-100" />

        {/* WEIGHT */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-black uppercase tracking-widest text-[#171c2a]">Weight</h2>
            <UnitToggle
              left="kg" right="lb"
              isLeft={!isWeightLb}
              onLeft={() => setWeightUnit("kg")}
              onRight={() => setWeightUnit("lb")}
              onToggle={() => setWeightUnit(isWeightLb ? "kg" : "lb")}
            />
          </div>
          <LabeledInput
            value={isWeightLb ? weightLb : weightKg}
            onChange={(e) => isWeightLb ? setWeightLb(Number(e.target.value)) : setWeightKg(Number(e.target.value))}
            label={isWeightLb ? "lb" : "kg"}
            max={isWeightLb ? 1500 : 680}
          />
        </div>
      </div>
    </section>
  );
}

// ─── Step 3: Birthday ─────────────────────────────────────────────────────────
function BirthdayStep({ month, setMonth, day, setDay, year, setYear }) {
  const months = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December",
  ];

  const maxDay = new Date(year, months.indexOf(month) + 1, 0).getDate();

  return (
    <section className="flex h-full flex-col pt-8">
      <div>
        <h1 className="text-[31px] font-black leading-[39px] tracking-[-0.8px] text-[#171c2a]">
          When were you<br />born?
        </h1>
        <p className="mt-4 max-w-[310px] text-[15px] font-medium leading-6 text-slate-500">
          This will be taken into account when calculating your daily nutrition goals.
        </p>
      </div>

      <div className="mt-12 flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <label className="text-left text-xs font-black uppercase tracking-widest text-slate-400">Month</label>
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="h-14 rounded-2xl border-2 border-slate-100 bg-slate-50 px-5 text-lg font-bold outline-none focus:border-[#ff3b66] focus:bg-white"
          >
            {months.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-left text-xs font-black uppercase tracking-widest text-slate-400">Day</label>
            <input type="number" min="1" max={maxDay} value={day} onChange={(e) => {
              let val = e.target.value === "" ? "" : Number(e.target.value);
              if (val !== "" && val > maxDay) val = maxDay;
              setDay(val);
            }}
              className="h-14 rounded-2xl border-2 border-slate-100 bg-slate-50 px-5 text-lg font-bold outline-none focus:border-[#ff3b66] focus:bg-white" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-left text-xs font-black uppercase tracking-widest text-slate-400">Year</label>
            <input type="number" min="1950" max={new Date().getFullYear()} value={year} onChange={(e) => {
              let val = e.target.value === "" ? "" : Number(e.target.value);
              if (val !== "" && val > new Date().getFullYear()) val = new Date().getFullYear();
              setYear(val);
            }}
              className="h-14 rounded-2xl border-2 border-slate-100 bg-slate-50 px-5 text-lg font-bold outline-none focus:border-[#ff3b66] focus:bg-white" />
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Steps 4 & 5: Generic choice list (activity + exercise frequency + goal) ──
function ChoiceStep({ title, subtitle, options, value, onChange, showEmoji = false }) {
  return (
    <section className="h-full overflow-y-auto pt-8 pb-4">
      <h1 className="text-[31px] font-black leading-[39px] tracking-[-0.8px] text-[#171c2a]">{title}</h1>
      <p className="mt-4 text-[15px] font-medium leading-6 text-slate-500">{subtitle}</p>

      <div className="mt-8 space-y-3">
        {options.map((option) => {
          const selected = value === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange(option.id)}
              className={`w-full rounded-[22px] border-2 px-5 py-4 text-left transition-all active:scale-[0.98] ${
                selected
                  ? "border-[#ff3b66] bg-[#fff1f5] text-[#ff3b66] shadow-[0_8px_16px_rgba(255,59,102,0.12)]"
                  : "border-transparent bg-[#fafafa] text-slate-900"
              }`}
            >
              <div className="flex items-center gap-3">
                {showEmoji && option.emoji && (
                  <span className="text-xl w-7 shrink-0 text-center">{option.emoji}</span>
                )}
                <div className="flex-1">
                  <span className="block text-base font-extrabold">{option.title}</span>
                  {option.subtitle && (
                    <span className={`mt-0.5 block text-xs font-semibold ${selected ? "text-[#ff7897]" : "text-slate-400"}`}>
                      {option.subtitle}
                    </span>
                  )}
                </div>
                {selected && (
                  <div className="ml-auto h-5 w-5 shrink-0 rounded-full bg-[#ff3b66] flex items-center justify-center">
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

// ─── Step 7: Target Weight ────────────────────────────────────────────────────
function TargetWeightStep({ currentWeightKg, goal, weightUnit, setWeightUnit, weightLb, setWeightLb, weightKg, setWeightKg }) {
  const isLb = weightUnit === "lb";
  const currentDisplay = isLb ? Math.round(currentWeightKg / 0.453592) : Math.round(currentWeightKg);
  const targetDisplay = isLb ? weightLb : weightKg;

  const diffKg = (isLb ? lbToKg(weightLb) : Number(weightKg)) - currentWeightKg;
  const diffDisplay = isLb ? Math.round(Math.abs(diffKg) / 0.453592) : Math.round(Math.abs(diffKg));
  const unit = isLb ? "lb" : "kg";

  let hint = null;
  if (goal === "lose" && diffKg < -1)
    hint = { text: `Lose ${diffDisplay}${unit}`, color: "text-orange-500", bg: "bg-orange-50", dot: "bg-orange-400" };
  else if (goal === "gain" && diffKg > 1)
    hint = { text: `Gain ${diffDisplay}${unit}`, color: "text-blue-500", bg: "bg-blue-50", dot: "bg-blue-400" };
  else if (Math.abs(diffKg) <= 1)
    hint = { text: "Maintain current weight", color: "text-emerald-600", bg: "bg-emerald-50", dot: "bg-emerald-400" };

  return (
    <section className="flex h-full flex-col pt-8">
      <div>
        <h1 className="text-[31px] font-black leading-[39px] tracking-[-0.8px] text-[#171c2a]">
          What's your<br />target weight?
        </h1>
        <p className="mt-4 text-[15px] font-medium leading-6 text-slate-500">
          Set a realistic target — Berry will track your progress over time.
        </p>
      </div>

      {/* Current vs Target */}
      <div className="mt-8 flex items-center gap-3 rounded-[20px] bg-[#f8f8f9] p-4">
        <div className="flex-1 text-center">
          <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Current</p>
          <p className="mt-1 text-2xl font-black text-slate-600">{currentDisplay}<span className="text-sm font-bold ml-1">{unit}</span></p>
        </div>
        <div className="text-slate-300 text-xl font-bold">→</div>
        <div className="flex-1 text-center">
          <p className="text-[11px] font-black uppercase tracking-widest text-[#ff3b66]">Target</p>
          <p className="mt-1 text-2xl font-black text-[#171c2a]">{targetDisplay}<span className="text-sm font-bold ml-1">{unit}</span></p>
        </div>
      </div>

      {hint && (
        <div className={`mt-4 flex items-center gap-2 rounded-[14px] ${hint.bg} px-4 py-3`}>
          <div className={`h-2 w-2 rounded-full ${hint.dot}`} />
          <p className={`text-sm font-bold ${hint.color}`}>{hint.text}</p>
        </div>
      )}

      {/* Unit toggle + input */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-black uppercase tracking-widest text-[#171c2a]">Target Weight</h2>
          <UnitToggle
            left="kg" right="lb"
            isLeft={!isLb}
            onLeft={() => setWeightUnit("kg")}
            onRight={() => setWeightUnit("lb")}
            onToggle={() => setWeightUnit(isLb ? "kg" : "lb")}
          />
        </div>
        <LabeledInput
          value={isLb ? weightLb : weightKg}
          onChange={(e) => isLb ? setWeightLb(Number(e.target.value)) : setWeightKg(Number(e.target.value))}
          label={unit}
          type="number"
          max={isLb ? 1500 : 680}
        />
      </div>
    </section>
  );
}

// ─── Step 8: Diet Preference ──────────────────────────────────────────────────
function DietPreferenceStep({ value, onChange }) {
  return (
    <section className="h-full overflow-y-auto pt-8 pb-4">
      <h1 className="text-[31px] font-black leading-[39px] tracking-[-0.8px] text-[#171c2a]">
        Diet Preference
      </h1>
      <p className="mt-4 text-[15px] font-medium leading-6 text-slate-500">
        This helps Berry suggest better food choices.
      </p>

      <div className="mt-8 space-y-3">
        {dietOptions.map((option) => {
          const selected = value === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange(option.id)}
              className={`h-[54px] w-full rounded-[18px] border-2 text-center text-sm font-extrabold transition-all active:scale-[0.98] ${
                selected
                  ? "border-[#ff3b66] bg-[#fff1f5] text-[#ff3b66] shadow-sm"
                  : "border-slate-100 bg-white text-slate-900 shadow-sm"
              }`}
            >
              {option.title}
            </button>
          );
        })}
      </div>
    </section>
  );
}

// ─── Step 9: Targets Summary ──────────────────────────────────────────────────
function TargetsSummaryStep({ goals, profile, onGoalsChange }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    calories: goals.calories,
    protein: goals.protein,
    fiber: goals.fiber,
    sodium: goals.sodium,
  });

  // Keep draft in sync when auto-goals change (e.g. navigating back then forward)
  const prevGoalsRef = React.useRef(goals);
  React.useEffect(() => {
    if (!editing && (
      prevGoalsRef.current.calories !== goals.calories ||
      prevGoalsRef.current.protein  !== goals.protein
    )) {
      setDraft({ calories: goals.calories, protein: goals.protein, fiber: goals.fiber, sodium: goals.sodium });
      prevGoalsRef.current = goals;
    }
  }, [goals, editing]);

  function handleEdit() { setEditing(true); }
  function handleDone() {
    setEditing(false);
    onGoalsChange({
      calories: Number(draft.calories),
      protein:  Number(draft.protein),
      fiber:    Number(draft.fiber),
      sodium:   Number(draft.sodium),
    });
  }
  function updateDraft(key, val) {
    setDraft((d) => ({ ...d, [key]: val }));
  }

  const targetDisplay = profile.targetWeightKg
    ? `${Math.round(profile.targetWeightKg)} kg`
    : null;

  const activityLabel = activityOptions.find(a => a.id === profile.activity)?.title || "—";
  const exerciseLabel = exerciseFrequencyOptions.find(e => e.id === profile.exerciseFrequency)?.title || "—";

  return (
    <section className="h-full overflow-y-auto pt-8 pb-4">
      <h1 className="text-[31px] font-black leading-[39px] tracking-[-0.8px] text-[#171c2a]">
        Your Targets
      </h1>
      <p className="mt-4 text-[15px] font-medium leading-6 text-slate-500">
        Here are your daily calculated goals.
      </p>

      {/* Profile snapshot */}
      <div className="mt-6 rounded-[24px] bg-[#f8f8f9] p-4 space-y-3">
        <SnapshotRow emoji="🏃" label="Activity" value={activityLabel} />
        <SnapshotRow emoji="💪" label="Exercise" value={exerciseLabel} />
        {targetDisplay && <SnapshotRow emoji="🎯" label="Target weight" value={targetDisplay} />}
      </div>

      {/* Macro targets */}
      <div className="mt-5 overflow-hidden rounded-[32px] bg-[#0f172a] p-6 text-white shadow-[0_24px_50px_rgba(0,0,0,0.25)]">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#ff3b66]/20">
              <Sparkles size={16} className="text-[#ff3b66]" />
            </div>
            <p className="text-sm font-black uppercase tracking-wider text-slate-300">Berry Targets</p>
          </div>

          {/* Edit / Done toggle */}
          <button
            type="button"
            onClick={editing ? handleDone : handleEdit}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-black uppercase tracking-widest transition-all ${
              editing
                ? "bg-[#ff3b66] text-white shadow-[0_4px_12px_rgba(255,59,102,0.4)]"
                : "bg-slate-800 text-slate-400 hover:bg-slate-700"
            }`}
          >
            {editing ? (
              <><Check size={11} /> Done</>
            ) : (
              <><Pencil size={11} /> Edit</>
            )}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <EditableTargetCard
            editing={editing}
            value={editing ? draft.calories : goals.calories}
            onChange={(v) => updateDraft("calories", v)}
            label="kcal" sub="Daily Energy" color="bg-orange-500"
          />
          <EditableTargetCard
            editing={editing}
            value={editing ? draft.protein : goals.protein}
            onChange={(v) => updateDraft("protein", v)}
            label="Protein" sub="Muscle Build" color="bg-blue-500" suffix="g"
          />
          <EditableTargetCard
            editing={editing}
            value={editing ? draft.fiber : goals.fiber}
            onChange={(v) => updateDraft("fiber", v)}
            label="Fiber" sub="Digestion" color="bg-emerald-500" suffix="g"
          />
          <EditableTargetCard
            editing={editing}
            value={editing ? draft.sodium : goals.sodium}
            onChange={(v) => updateDraft("sodium", v)}
            label="Sodium" sub="Heart Health" color="bg-rose-500" suffix="g" step={0.1}
          />
        </div>

        {editing && (
          <p className="mt-4 text-center text-[10px] font-semibold text-slate-500">
            Tap values to edit · tap Done to save
          </p>
        )}
      </div>
    </section>
  );
}

function SnapshotRow({ emoji, label, value }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-base">{emoji}</span>
        <span className="text-sm font-bold text-slate-500">{label}</span>
      </div>
      <span className="text-sm font-extrabold text-[#171c2a]">{value}</span>
    </div>
  );
}

function EditableTargetCard({ editing, value, onChange, label, sub, color, suffix = "", step = 1 }) {
  return (
    <div className={`group relative overflow-hidden rounded-2xl p-4 transition-all ${
      editing ? "bg-white/10 ring-1 ring-white/20" : "bg-white/5 hover:bg-white/10"
    }`}>
      <div className={`absolute -right-2 -top-2 h-12 w-12 rounded-full opacity-10 blur-xl ${color}`} />
      {editing ? (
        <div className="relative flex items-baseline gap-1">
          <input
            type="number"
            step={step}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-transparent text-2xl font-black text-white outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none pb-0.5 pr-1"
          />
          {suffix && <span className="text-sm font-bold text-slate-400">{suffix}</span>}
        </div>
      ) : (
        <p className="text-2xl font-black text-white">{value}{suffix}</p>
      )}
      <p className="mt-0.5 text-xs font-bold text-slate-400">{label}</p>
      <div className="mt-3 flex items-center gap-1.5">
        <div className={`h-1 w-1 rounded-full ${color}`} />
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">{sub}</p>
      </div>
    </div>
  );
}

// ─── Shared helpers ────────────────────────────────────────────────────────────
function UnitToggle({ left, right, isLeft, onLeft, onRight, onToggle }) {
  return (
    <div className="flex items-center gap-3">
      <button type="button" onClick={onLeft}
        className={`text-sm font-bold ${isLeft ? "text-[#ff3b66]" : "text-slate-400"}`}>
        {left}
      </button>
      <button type="button" onClick={onToggle}
        className="relative h-6 w-12 rounded-full border border-slate-200 bg-slate-100 p-0.5"
        aria-label="Switch unit">
        <span className={`block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${isLeft ? "translate-x-0" : "translate-x-6"}`} />
      </button>
      <button type="button" onClick={onRight}
        className={`text-sm font-bold ${!isLeft ? "text-[#ff3b66]" : "text-slate-400"}`}>
        {right}
      </button>
    </div>
  );
}

function LabeledInput({ value, onChange, label, type = "number", max }) {
  const handleChange = (e) => {
    let val = e.target.value;
    if (type === "number") {
      if (val === "") {
        onChange({ target: { value: "" } });
        return;
      }
      val = Number(val);
      if (max !== undefined && val > max) val = max;
    }
    onChange({ target: { value: val } });
  };

  return (
    <div className="flex flex-col gap-2">
      <input
        type={type}
        value={value}
        onChange={handleChange}
        max={max}
        className="h-14 rounded-2xl border-2 border-slate-100 bg-slate-50 px-5 text-center text-lg font-bold outline-none focus:border-[#ff3b66] focus:bg-white"
      />
      <label className="text-xs font-black uppercase tracking-widest text-slate-400 text-center">{label}</label>
    </div>
  );
}
