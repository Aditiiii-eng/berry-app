import { request, USE_MOCK_API, wait } from "./client";

const mockStatus = {
  checklist: {},
  stats: {
    currentStreak: 0,
    longestStreak: 0,
    programsCompleted: 0,
    totalDays: 0,
  },
  activeProgram: null,
  journal: null,
};

export async function getDetoxStatus() {
  if (USE_MOCK_API) {
    await wait(200);
    return mockStatus;
  }
  try {
    return await request("/progress/detox/status");
  } catch {
    // Degrade gracefully — screen still renders with empty state
    return mockStatus;
  }
}

export async function logDetoxChecklist(itemId, done) {
  if (USE_MOCK_API) {
    await wait(80);
    return { ok: true };
  }
  // POST /progress/detox/checklist — backend upserts a DetoxLog row keyed by habit_name
  return request("/progress/detox/checklist", {
    method: "POST",
    body: JSON.stringify({ item_id: itemId, done }),
  });
}

export async function saveDetoxJournal(journal) {
  if (USE_MOCK_API) {
    await wait(120);
    return { ok: true };
  }
  try {
    return await request("/progress/detox/journal", {
      method: "POST",
      body: JSON.stringify(journal),
    });
  } catch {
    // Journal is best-effort; don't surface a hard error
    return { ok: true };
  }
}

export async function getDetoxPrograms() {
  if (USE_MOCK_API) {
    await wait(150);
    return { programs: [] };
  }
  try {
    return await request("/progress/detox/programs");
  } catch {
    return { programs: [] };
  }
}

export async function startDetoxProgram(programId, program = {}) {
  if (USE_MOCK_API) {
    await wait(150);
    return { ok: true, program: { id: programId, ...program } };
  }
  try {
    return await request("/progress/detox/start", {
      method: "POST",
      body: JSON.stringify({
        program_id: programId,
        program_name: program.name || null,
        program_emoji: program.emoji || null,
        program_days: program.days || 7,
      }),
    });
  } catch {
    // Programs are local-state only as fallback — just acknowledge
    return { ok: true, program: { id: programId, ...program } };
  }
}
