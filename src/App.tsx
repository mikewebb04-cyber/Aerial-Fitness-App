import { useEffect, useMemo, useState } from "react";

type Discipline = "Pole" | "Hoop" | "Bungee" | "Silks" | "Other";

type Session = {
  id: string;
  discipline: Discipline;
  date: string; // YYYY-MM-DD
  notes: string;
  createdAt: number; // for reliable sorting
};

type Tab = "sessions" | "skills" | "goals";

const STORAGE_KEY = "aerial_fitness_sessions_v2";

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

export default function App() {
  const [tab, setTab] = useState<Tab>("sessions");

  // Form fields
  const [discipline, setDiscipline] = useState<Discipline>("Pole");
  const [date, setDate] = useState<string>(todayISODate());
  const [notes, setNotes] = useState<string>("");

  // Stored sessions
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return;

      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        const cleaned: Session[] = parsed
          .filter((x) => x && typeof x === "object")
          .map((x: any) => ({
            id: typeof x.id === "string" ? x.id : makeId(),
            discipline:
              x.discipline === "Pole" ||
              x.discipline === "Hoop" ||
              x.discipline === "Bungee" ||
              x.discipline === "Silks" ||
              x.discipline === "Other"
                ? x.discipline
                : "Other",
            date: typeof x.date === "string" ? x.date : todayISODate(),
            notes: typeof x.notes === "string" ? x.notes : "",
            createdAt: typeof x.createdAt === "number" ? x.createdAt : Date.now(),
          }));

        setSessions(cleaned);
      }
    } catch (err) {
      console.warn("Could not load sessions:", err);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    } catch (err) {
      console.warn("Could not save sessions:", err);
    }
  }, [sessions]);

  const sortedSessions = useMemo(() => {
    return [...sessions].sort((a, b) => b.createdAt - a.createdAt);
  }, [sessions]);

  const stats = useMemo(() => {
    const total = sessions.length;
    const by: Record<Discipline, number> = {
      Pole: 0,
      Hoop: 0,
      Bungee: 0,
      Silks: 0,
      Other: 0,
    };
    for (const s of sessions) by[s.discipline]++;

    // Sessions in last 7 days
    const now = Date.now();
    const week = sessions.filter((s) => now - s.createdAt < 7 * 24 * 60 * 60 * 1000).length;

    return { total, week, by };
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

  function clearAll() {
    const ok = confirm("Delete ALL saved sessions on this device?");
    if (!ok) return;
    setSessions([]);
    localStorage.removeItem(STORAGE_KEY);
  }

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
              : "Goals (coming next)"}
          </div>
        </header>

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
                <button className="btn" onClick={clearAll}>
                  Clear all
                </button>
              </div>

              <div className="hint">
                <strong>Quick stats:</strong> {stats.week} sessions in the last 7 days • {stats.total} total
              </div>
              <div className="hint">
                {Object.entries(stats.by)
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

        {tab === "skills" && (
          <div className="card">
            <h2 className="sectionTitle">Skills (next)</h2>
            <p className="hint">
              Next we’ll add a skill library per discipline and let you mark skills as
              <strong> Learning / Achieved / Mastered</strong>.
            </p>
          </div>
        )}

        {tab === "goals" && (
          <div className="card">
            <h2 className="sectionTitle">Goals (next)</h2>
            <p className="hint">
              Next we’ll add simple goals like “Invert by June” with optional target dates.
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