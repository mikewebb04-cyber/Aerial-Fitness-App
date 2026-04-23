
import { useEffect, useMemo, useState } from "react";

type Discipline = "Pole" | "Hoop" | "Bungee" | "Silks" | "Other";

type Session = {
  id: string;
  discipline: Discipline;
  date: string; // YYYY-MM-DD
  notes: string;
  createdAt: number; // used for sorting and "last 7 days" stats
};

type GoalStatus = "active" | "achieved";

type Goal = {
  id: string;

  // ✅ multi-discipline
  disciplines: Discipline[];

  title: string;
  targetDate?: string; // YYYY-MM-DD
  notes?: string;

  // ✅ progress tracking (0-100)
  progress: number;
  updatedAt: number;

  status: GoalStatus;
  createdAt: number;
  achievedAt?: number;
};

type Tab = "sessions" | "skills" | "goals";

const SESSIONS_KEY = "aerial_fitness_sessions_v2";

// Goals keys for migration
const GOALS_KEY_V3 = "aerial_fitness_goals_v3"; // ✅ multi-discipline + progress
const GOALS_KEY_V2 = "aerial_fitness_goals_v2"; // single discipline
const GOALS_KEY_V1 = "aerial_fitness_goals_v1"; // no discipline

const ALL_DISCIPLINES: Discipline[] = ["Pole", "Hoop", "Bungee", "Silks", "Other"];

function todayISODate() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function isDiscipline(x: any): x is Discipline {
  return x === "Pole" || x === "Hoop" || x === "Bungee" || x === "Silks" || x === "Other";
}

function safeParseArray(raw: string | null) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function clampInt(n: any, min: number, max: number) {
  const num = typeof n === "number" ? n : parseInt(String(n), 10);
  if (Number.isNaN(num)) return min;
  return Math.max(min, Math.min(max, Math.round(num)));
}

function disciplineEmoji(d: Discipline) {
  switch (d) {
    case "Pole":
      return "💈";
    case "Hoop":
      return "⭕";
    case "Bungee":
      return "🪢";
    case "Silks":
      return "🧣";
    default:
      return "✨";
  }
}

function formatISOFromMs(ms?: number) {
  if (!ms) return "";
  try {
    return new Date(ms).toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

export default function App() {
  const [tab, setTab] = useState<Tab>("sessions");

  /* ----------------------------- SESSIONS ----------------------------- */

  const [discipline, setDiscipline] = useState<Discipline>("Pole");
  const [date, setDate] = useState<string>(todayISODate());
  const [notes, setNotes] = useState<string>("");

  const [sessions, setSessions] = useState<Session[]>([]);

  // Load sessions
  useEffect(() => {
    const parsed = safeParseArray(localStorage.getItem(SESSIONS_KEY));
    if (!parsed) return;

    const cleaned: Session[] = parsed
      .filter((x) => x && typeof x === "object")
      .map((x: any) => ({
        id: typeof x.id === "string" ? x.id : makeId(),
        discipline: isDiscipline(x.discipline) ? x.discipline : "Other",
        date: typeof x.date === "string" ? x.date : todayISODate(),
        notes: typeof x.notes === "string" ? x.notes : "",
        createdAt: typeof x.createdAt === "number" ? x.createdAt : Date.now(),
      }));

    setSessions(cleaned);
  }, []);

  // Save sessions
  useEffect(() => {
    try {
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
    } catch (err) {
      console.warn("Could not save sessions:", err);
    }
  }, [sessions]);

  const sortedSessions = useMemo(() => {
    return [...sessions].sort((a, b) => b.createdAt - a.createdAt);
  }, [sessions]);

  const sessionStats = useMemo(() => {
    const total = sessions.length;
    const by: Record<Discipline, number> = {
      Pole: 0,
      Hoop: 0,
      Bungee: 0,
      Silks: 0,
      Other: 0,
    };

    for (const s of sessions) by[s.discipline]++;

    const now = Date.now();
    const last7Days = sessions.filter((s) => now - s.createdAt < 7 * 24 * 60 * 60 * 1000).length;

    return { total, last7Days, by };
  }, [sessions]);

  function addSession() {
    const cleanNotes = notes.trim();
    if (!cleanNotes) return;

    const newSession: Session = {
      id: makeId(),
      discipline,
      date,
      notes: cleanNotes,
      createdAt: Date.now(),
    };

    setSessions((prev) => [newSession, ...prev]);
    setNotes("");
  }

  function deleteSession(id: string) {
    setSessions((prev) => prev.filter((s) => s.id !== id));
  }

  function clearAllSessions() {
    const ok = confirm("Delete ALL saved sessions on this device?");
    if (!ok) return;
    setSessions([]);
    localStorage.removeItem(SESSIONS_KEY);
  }

  /* ------------------------------ GOALS ------------------------------ */

  const [goals, setGoals] = useState<Goal[]>([]);

  // Goal form
  const [goalTitle, setGoalTitle] = useState<string>("");
  const [goalTargetDate, setGoalTargetDate] = useState<string>("");
  const [goalNotes, setGoalNotes] = useState<string>("");
  const [goalDisciplines, setGoalDisciplines] = useState<Discipline[]>(["Pole"]);
  const [goalProgress, setGoalProgress] = useState<number>(0);

  // Filter
  const [goalFilter, setGoalFilter] = useState<Discipline | "All">("All");

  // Load goals (v3 first; else migrate v2/v1)
  useEffect(() => {
    // v3 already?
    const parsedV3 = safeParseArray(localStorage.getItem(GOALS_KEY_V3));
    if (parsedV3) {
      const cleaned: Goal[] = parsedV3
        .filter((x) => x && typeof x === "object")
        .map((x: any) => {
          const discsRaw = Array.isArray(x.disciplines) ? x.disciplines : [];
          const discs = discsRaw.filter(isDiscipline);
          return {
            id: typeof x.id === "string" ? x.id : makeId(),
            disciplines: discs.length ? discs : ["Other"],
            title: typeof x.title === "string" ? x.title : "Untitled goal",
            targetDate: typeof x.targetDate === "string" ? x.targetDate : undefined,
            notes: typeof x.notes === "string" ? x.notes : undefined,
            progress: clampInt(x.progress, 0, 100),
            updatedAt: typeof x.updatedAt === "number" ? x.updatedAt : Date.now(),
            status: x.status === "achieved" ? "achieved" : "active",
            createdAt: typeof x.createdAt === "number" ? x.createdAt : Date.now(),
            achievedAt: typeof x.achievedAt === "number" ? x.achievedAt : undefined,
          };
        });

      setGoals(cleaned);
      return;
    }

    // migrate v2 (single discipline) if present
    const parsedV2 = safeParseArray(localStorage.getItem(GOALS_KEY_V2));
    if (parsedV2) {
      const migrated: Goal[] = parsedV2
        .filter((x) => x && typeof x === "object")
        .map((x: any) => {
          const single = isDiscipline(x.discipline) ? x.discipline : "Other";
          const status: GoalStatus = x.status === "achieved" ? "achieved" : "active";
          const createdAt = typeof x.createdAt === "number" ? x.createdAt : Date.now();
          const achievedAt = typeof x.achievedAt === "number" ? x.achievedAt : undefined;
          const progress =
            typeof x.progress === "number"
              ? clampInt(x.progress, 0, 100)
              : status === "achieved"
              ? 100
              : 0;

          return {
            id: typeof x.id === "string" ? x.id : makeId(),
            disciplines: [single],
            title: typeof x.title === "string" ? x.title : "Untitled goal",
            targetDate: typeof x.targetDate === "string" ? x.targetDate : undefined,
            notes: typeof x.notes === "string" ? x.notes : undefined,
            progress,
            updatedAt: Date.now(),
            status,
            createdAt,
            achievedAt,
          };
        });

      setGoals(migrated);
      try {
        localStorage.setItem(GOALS_KEY_V3, JSON.stringify(migrated));
      } catch (err) {
        console.warn("Could not migrate goals v2->v3:", err);
      }
      return;
    }

    // migrate v1 (no discipline)
    const parsedV1 = safeParseArray(localStorage.getItem(GOALS_KEY_V1));
    if (parsedV1) {
      const migrated: Goal[] = parsedV1
        .filter((x) => x && typeof x === "object")
        .map((x: any) => {
          const status: GoalStatus = x.status === "achieved" ? "achieved" : "active";
          const createdAt = typeof x.createdAt === "number" ? x.createdAt : Date.now();
          const achievedAt = typeof x.achievedAt === "number" ? x.achievedAt : undefined;
          return {
            id: typeof x.id === "string" ? x.id : makeId(),
            disciplines: ["Other"],
            title: typeof x.title === "string" ? x.title : "Untitled goal",
            targetDate: typeof x.targetDate === "string" ? x.targetDate : undefined,
            notes: typeof x.notes === "string" ? x.notes : undefined,
            progress: status === "achieved" ? 100 : 0,
            updatedAt: Date.now(),
            status,
            createdAt,
            achievedAt,
          };
        });

      setGoals(migrated);
      try {
        localStorage.setItem(GOALS_KEY_V3, JSON.stringify(migrated));
      } catch (err) {
        console.warn("Could not migrate goals v1->v3:", err);
      }
    }
  }, []);

  // Save goals to v3
  useEffect(() => {
    try {
      localStorage.setItem(GOALS_KEY_V3, JSON.stringify(goals));
    } catch (err) {
      console.warn("Could not save goals:", err);
    }
  }, [goals]);

  function toggleDisciplineSelection(d: Discipline) {
    setGoalDisciplines((prev) => {
      if (prev.includes(d)) {
        const next = prev.filter((x) => x !== d);
        return next.length ? next : ["Other"]; // never allow zero selected
      }
      return [...prev, d];
    });
  }

  function addGoal() {
    const title = goalTitle.trim();
    if (!title) return;

    const discs = goalDisciplines.length ? goalDisciplines : ["Other"];
    const progress = clampInt(goalProgress, 0, 100);

    const newGoal: Goal = {
      id: makeId(),
      disciplines: discs,
      title,
      targetDate: goalTargetDate ? goalTargetDate : undefined,
      notes: goalNotes.trim() ? goalNotes.trim() : undefined,
      progress,
      updatedAt: Date.now(),
      status: progress >= 100 ? "achieved" : "active",
      createdAt: Date.now(),
      achievedAt: progress >= 100 ? Date.now() : undefined,
    };

    setGoals((prev) => [newGoal, ...prev]);

    // reset form (keep disciplines for quick entry, reset progress to 0)
    setGoalTitle("");
    setGoalTargetDate("");
    setGoalNotes("");
    setGoalProgress(0);
  }

  function deleteGoal(id: string) {
    setGoals((prev) => prev.filter((g) => g.id !== id));
  }

  function clearAllGoals() {
    const ok = confirm("Delete ALL saved goals on this device?");
    if (!ok) return;
    setGoals([]);
    localStorage.removeItem(GOALS_KEY_V3);
  }

  function toggleGoalStatus(id: string) {
    setGoals((prev) =>
      prev.map((g) => {
        if (g.id !== id) return g;

        if (g.status === "active") {
          // when achieving, ensure progress is 100
          return {
            ...g,
            status: "achieved",
            progress: 100,
            achievedAt: Date.now(),
            updatedAt: Date.now(),
          };
        }

        // back to active (keep progress at 100 unless you change it)
        return {
          ...g,
          status: "active",
          achievedAt: undefined,
          updatedAt: Date.now(),
        };
      })
    );
  }

  function setGoalProgressById(id: string, value: number) {
    const v = clampInt(value, 0, 100);
    setGoals((prev) =>
      prev.map((g) => {
        if (g.id !== id) return g;
        const nextStatus: GoalStatus = v >= 100 ? "achieved" : "active";
        return {
          ...g,
          progress: v,
          status: nextStatus,
          achievedAt: nextStatus === "achieved" ? g.achievedAt ?? Date.now() : undefined,
          updatedAt: Date.now(),
        };
      })
    );
  }

  function nudgeGoalProgress(id: string, delta: number) {
    const g = goals.find((x) => x.id === id);
    if (!g) return;
    setGoalProgressById(id, g.progress + delta);
  }

  function goalMatchesFilter(g: Goal) {
    if (goalFilter === "All") return true;
    return g.disciplines.includes(goalFilter);
  }

  const goalsFiltered = useMemo(() => goals.filter(goalMatchesFilter), [goals, goalFilter]);

  const goalsActive = useMemo(
    () => goalsFiltered.filter((g) => g.status === "active").sort((a, b) => {
      // Active: soonest target date first (if both have), otherwise newest updated first
      const ad = a.targetDate || "";
      const bd = b.targetDate || "";
      if (ad && bd) return ad.localeCompare(bd);
      if (ad && !bd) return -1;
      if (!ad && bd) return 1;
      return b.updatedAt - a.updatedAt;
    }),
    [goalsFiltered]
  );

  const goalsAchieved = useMemo(
    () =>
      goalsFiltered
        .filter((g) => g.status === "achieved")
        .sort((a, b) => (b.achievedAt || b.updatedAt) - (a.achievedAt || a.updatedAt)),
    [goalsFiltered]
  );

  const goalsStats = useMemo(() => {
    const total = goals.length;
    const active = goals.filter((g) => g.status === "active").length;
    const achieved = goals.filter((g) => g.status === "achieved").length;
    return { total, active, achieved };
  }, [goals]);

  const goalsByDiscipline = useMemo(() => {
    const by: Record<Discipline, { active: number; achieved: number }> = {
      Pole: { active: 0, achieved: 0 },
      Hoop: { active: 0, achieved: 0 },
      Bungee: { active: 0, achieved: 0 },
      Silks: { active: 0, achieved: 0 },
      Other: { active: 0, achieved: 0 },
    };

    for (const g of goals) {
      for (const d of g.disciplines) {
        if (g.status === "active") by[d].active++;
        else by[d].achieved++;
      }
    }
    return by;
  }, [goals]);

  /* ------------------------------ UI ------------------------------ */

  return (
    <>
      <div className="container">
        <header className="appbar">
          <div className="title">Aerial Journey</div>
          <div className="subtitle">
            {tab === "sessions"
              ? "Log sessions and track momentum"
              : tab === "skills"
              ? "Skills (coming next)"
              : "Multi-discipline goals with progress tracking"}
          </div>
        </header>

        {/* ------------------------- SESSIONS TAB ------------------------- */}
        {tab === "sessions" && (
          <>
            <div className="card">
              <h2 className="sectionTitle">Log a training session</h2>

              <div className="row">
                <div>
                  <label className="label">Discipline</label>
                  <select
                    className="select"
                    value={discipline}
                    onChange={(e) => setDiscipline(e.target.value as Discipline)}
                  >
                    <option value="Pole">Pole</option>
                    <option value="Hoop">Hoop (Lyra)</option>
                    <option value="Bungee">Bungee</option>
                    <option value="Silks">Silks</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="label">Date</label>
                  <input
                    className="input"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
              </div>

              <label className="label">Notes</label>
              <textarea
                className="textarea"
                placeholder="What did you work on? How did it feel? Anything to remember next time?"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />

              <div className="actions">
                <button className="btn btnPrimary" onClick={addSession}>
                  Save session
                </button>
                <button className="btn" onClick={clearAllSessions}>
                  Clear all
                </button>
              </div>

              <div className="hint">
                <strong>Quick stats:</strong> {sessionStats.last7Days} sessions in the last 7 days •{" "}
                {sessionStats.total} total
              </div>

              <div className="hint">
                {Object.entries(sessionStats.by)
                  .filter(([, n]) => n > 0)
                  .map(([d, n]) => `${disciplineEmoji(d as Discipline)} ${d}: ${n}`)
                  .join("  •  ") || "Log a session to start building your history."}
              </div>
            </div>

            <h2 className="sectionTitle" style={{ marginTop: 18 }}>
              Your sessions
            </h2>

            {sortedSessions.length === 0 ? (
              <div className="card">
                <div className="sectionTitle">Nothing logged yet</div>
                <div className="hint">
                  Start small: log today’s session with one sentence. Consistency beats perfection.
                </div>
              </div>
            ) : (
              <div className="list">
                {sortedSessions.map((s) => (
                  <div className="sessionCard" key={s.id}>
                    <div className="sessionTop">
                      <div>
                        <div className="badge">
                          <span aria-hidden="true">{disciplineEmoji(s.discipline)}</span>
                          <span>{s.discipline}</span>
                        </div>
                        <div className="meta">{s.date}</div>
                      </div>

                      <button className="btn" onClick={() => deleteSession(s.id)}>
                        Delete
                      </button>
                    </div>

                    <div className="notes">{s.notes}</div>
                  </div>
                ))}
              </div>
            )}

            <div className="hint" style={{ marginTop: 16 }}>
              Saved on this device only. Later we can add accounts so it syncs across phones.
            </div>
          </>
        )}

        {/* -------------------------- GOALS TAB -------------------------- */}
        {tab === "goals" && (
          <>
            <div className="card">
              <h2 className="sectionTitle">Add a goal</h2>

              <label className="label">Disciplines (choose one or more)</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {ALL_DISCIPLINES.map((d) => {
                  const selected = goalDisciplines.includes(d);
                  return (
                    <button
                      key={d}
                      className={`btn ${selected ? "btnPrimary" : ""}`}
                      onClick={() => toggleDisciplineSelection(d)}
                      type="button"
                      style={{
                        height: 40,
                        padding: "0 12px",
                        borderRadius: 999,
                        fontWeight: 900,
                      }}
                      aria-pressed={selected}
                    >
                      {disciplineEmoji(d)} {d}
                    </button>
                  );
                })}
              </div>

              <div className="row" style={{ marginTop: 12 }}>
                <div>
                  <label className="label">Target date (optional)</label>
                  <input
                    className="input"
                    type="date"
                    value={goalTargetDate}
                    onChange={(e) => setGoalTargetDate(e.target.value)}
                  />
                </div>

                <div>
                  <label className="label">Starting progress</label>
                  <input
                    className="input"
                    type="number"
                    min={0}
                    max={100}
                    value={goalProgress}
                    onChange={(e) => setGoalProgress(clampInt(e.target.value, 0, 100))}
                    placeholder="0–100"
                  />
                </div>
              </div>

              <label className="label">Goal</label>
              <input
                className="input"
                placeholder="e.g. Stronger grip + clean invert"
                value={goalTitle}
                onChange={(e) => setGoalTitle(e.target.value)}
              />

              <label className="label">Notes (optional)</label>
              <textarea
                className="textarea"
                placeholder="What success looks like / cues / how you’ll work on it"
                value={goalNotes}
                onChange={(e) => setGoalNotes(e.target.value)}
              />

              <div className="actions">
                <button className="btn btnPrimary" onClick={addGoal}>
                  Add goal
                </button>
                <button className="btn" onClick={clearAllGoals}>
                  Clear all
                </button>
              </div>

              <div className="hint">
                <strong>All goals:</strong> {goalsStats.active} active • {goalsStats.achieved} achieved
              </div>

              <div className="hint">
                {Object.entries(goalsByDiscipline)
                  .map(([d, v]) => `${disciplineEmoji(d as Discipline)} ${d}: ${v.active} active, ${v.achieved} achieved`)
                  .join("  •  ")}
              </div>
            </div>

            <div className="card" style={{ marginTop: 12 }}>
              <h2 className="sectionTitle">Filter</h2>
              <label className="label">Show goals for</label>
              <select
                className="select"
                value={goalFilter}
                onChange={(e) => setGoalFilter(e.target.value as Discipline | "All")}
              >
                <option value="All">All disciplines</option>
                <option value="Pole">Pole</option>
                <option value="Hoop">Hoop (Lyra)</option>
                <option value="Bungee">Bungee</option>
                <option value="Silks">Silks</option>
                <option value="Other">Other</option>
              </select>
              <div className="hint">Filtering shows goals that include the selected discipline.</div>
            </div>

            <h2 className="sectionTitle" style={{ marginTop: 18 }}>
              Active goals
            </h2>

            {goalsActive.length === 0 ? (
              <div className="card">
                <div className="sectionTitle">No active goals for this filter</div>
                <div className="hint">Add a small, kind goal you can move forward over the next few sessions.</div>
              </div>
            ) : (
              <div className="list">
                {goalsActive.map((g) => (
                  <div className="sessionCard" key={g.id}>
                    <div className="sessionTop">
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                          {g.disciplines.map((d) => (
                            <span key={d} className="badge">
                              <span aria-hidden="true">{disciplineEmoji(d)}</span>
                              <span>{d}</span>
                            </span>
                          ))}
                        </div>

                        <div style={{ fontWeight: 900, marginTop: 10 }}>{g.title}</div>
                        <div className="meta">
                          {g.targetDate ? `Target: ${g.targetDate}` : "No target date set"} • Updated:{" "}
                          {formatISOFromMs(g.updatedAt) || "—"}
                        </div>
                      </div>

                      <button className="btn" onClick={() => deleteGoal(g.id)}>
                        Delete
                      </button>
                    </div>

                    {g.notes ? <div className="notes">{g.notes}</div> : null}

                    {/* Progress UI */}
                    <div style={{ marginTop: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                        <div style={{ fontWeight: 900 }}>Progress</div>
                        <div className="meta">{g.progress}%</div>
                      </div>

                      {/* progress bar (simple, inline) */}
                      <div
                        style={{
                          marginTop: 8,
                          height: 10,
                          borderRadius: 999,
                          background: "rgba(100, 116, 139, 0.18)",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${g.progress}%`,
                            height: "100%",
                            borderRadius: 999,
                            background: "rgba(17, 24, 39, 0.9)",
                          }}
                        />
                      </div>

                      {/* slider */}
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={g.progress}
                        onChange={(e) => setGoalProgressById(g.id, clampInt(e.target.value, 0, 100))}
                        style={{ width: "100%", marginTop: 10 }}
                        aria-label="Goal progress"
                      />

                      {/* quick buttons */}
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginTop: 10 }}>
                        <button className="btn" onClick={() => nudgeGoalProgress(g.id, -10)} type="button">
                          -10
                        </button>
                        <button className="btn" onClick={() => nudgeGoalProgress(g.id, -5)} type="button">
                          -5
                        </button>
                        <button className="btn" onClick={() => nudgeGoalProgress(g.id, +5)} type="button">
                          +5
                        </button>
                        <button className="btn" onClick={() => nudgeGoalProgress(g.id, +10)} type="button">
                          +10
                        </button>
                      </div>

                      <div className="actions" style={{ marginTop: 12 }}>
                        <button className="btn btnPrimary" onClick={() => toggleGoalStatus(g.id)}>
                          Mark achieved (sets 100%)
                        </button>
                      </div>

                      <div className="hint">
                        Tip: Progress can go up or down — that’s normal. Showing up still counts.
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <h2 className="sectionTitle" style={{ marginTop: 18 }}>
              Achieved
            </h2>

            {goalsAchieved.length === 0 ? (
              <div className="hint">Nothing achieved yet — keep going. Consistency is progress.</div>
            ) : (
              <div className="list">
                {goalsAchieved.map((g) => (
                  <div className="sessionCard" key={g.id}>
                    <div className="sessionTop">
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                          <span className="badge">
                            <span aria-hidden="true">✅</span>
                            <span>Achieved</span>
                          </span>
                          {g.disciplines.map((d) => (
                            <span key={d} className="badge">
                              <span aria-hidden="true">{disciplineEmoji(d)}</span>
                              <span>{d}</span>
                            </span>
                          ))}
                        </div>

                        <div style={{ fontWeight: 900, marginTop: 10 }}>{g.title}</div>
                        <div className="meta">
                          Achieved: {formatISOFromMs(g.achievedAt) || "—"}{" "}
                          {g.targetDate ? `• Target was: ${g.targetDate}` : ""} • Progress: {g.progress}%
                        </div>
                      </div>

                      <button className="btn" onClick={() => deleteGoal(g.id)}>
                        Delete
                      </button>
                    </div>

                    {g.notes ? <div className="notes">{g.notes}</div> : null}

                    <div className="actions" style={{ marginTop: 12 }}>
                      <button className="btn" onClick={() => toggleGoalStatus(g.id)}>
                        Move back to active
                      </button>
                      <button className="btn" onClick={() => setGoalProgressById(g.id, 90)} type="button">
                        Set to 90%
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="hint" style={{ marginTop: 16 }}>
              Saved on this device only. Later we can sync goals across devices with accounts.
            </div>
          </>
        )}

        {/* -------------------------- SKILLS TAB -------------------------- */}
        {tab === "skills" && (
          <div className="card">
            <h2 className="sectionTitle">Skills (next)</h2>
            <p className="hint">
              Next we’ll add a skill library per discipline and let you mark skills as{" "}
              <strong>Learning / Achieved / Mastered</strong>.
            </p>
          </div>
        )}
      </div>

      <nav className="bottomNav" role="navigation" aria-label="Bottom navigation">
        <div className="bottomNavInner">
          <button
            className={`navBtn ${tab === "sessions" ? "navBtnActive" : ""}`}
            onClick={() => setTab("sessions")}
          >
            Sessions
          </button>
          <button
            className={`navBtn ${tab === "skills" ? "navBtnActive" : ""}`}
            onClick={() => setTab("skills")}
          >
            Skills
          </button>
          <button
            className={`navBtn ${tab === "goals" ? "navBtnActive" : ""}`}
            onClick={() => setTab("goals")}
          >
            Goals
          </button>
        </div>
      </nav>
    </>
  );
}
