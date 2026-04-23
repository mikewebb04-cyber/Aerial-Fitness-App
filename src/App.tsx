
import { useEffect, useMemo, useState } from "react";

type Discipline = "Pole" | "Hoop" | "Bungee" | "Silks" | "Other";

type Session = {
  id: string;
  discipline: Discipline;
  date: string; // YYYY-MM-DD
  notes: string;
  createdAt: number; // for reliable sorting
};

const STORAGE_KEY = "aerial_fitness_sessions_v2";

// Small helper to get today's date in YYYY-MM-DD
function todayISODate() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// Small helper for unique IDs (good enough for now)
function makeId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function App() {
  // Form fields
  const [discipline, setDiscipline] = useState<Discipline>("Pole");
  const [date, setDate] = useState<string>(todayISODate());
  const [notes, setNotes] = useState<string>("");

  // Stored sessions
  const [sessions, setSessions] = useState<Session[]>([]);

  // Load saved sessions when app starts
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return;

      const parsed = JSON.parse(saved);

      if (Array.isArray(parsed)) {
        // Basic validation + fallback defaults
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

  // Save sessions whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    } catch (err) {
      console.warn("Could not save sessions:", err);
    }
  }, [sessions]);

  // Sorted sessions (newest first)
  const sortedSessions = useMemo(() => {
    return [...sessions].sort((a, b) => b.createdAt - a.createdAt);
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
    // keep date and discipline as-is for quick repeated logging
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
    <div style={{ padding: 20, fontFamily: "sans-serif", maxWidth: 520, margin: "0 auto" }}>
      <h1 style={{ marginBottom: 8 }}>My Aerial Fitness Journey</h1>
      <p style={{ marginTop: 0, color: "#555" }}>
        Log sessions with discipline + date + notes. Saved on this device.
      </p>

      <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 14, marginTop: 16 }}>
        <h2 style={{ marginTop: 0 }}>Log a training session</h2>

        <label style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>
          Discipline
        </label>
        <select
          value={discipline}
          onChange={(e) => setDiscipline(e.target.value as Discipline)}
          style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
        >
          <option value="Pole">Pole</option>
          <option value="Hoop">Hoop (Lyra)</option>
          <option value="Bungee">Bungee</option>
          <option value="Silks">Silks</option>
          <option value="Other">Other</option>
        </select>

        <label style={{ display: "block", marginTop: 12, marginBottom: 6, fontWeight: 600 }}>
          Date
        </label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
        />

        <label style={{ display: "block", marginTop: 12, marginBottom: 6, fontWeight: 600 }}>
          Notes
        </label>
        <textarea
          placeholder="What did you work on? How did it feel? Anything to remember next time?"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          style={{ width: "100%", minHeight: 90, padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
        />

        <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
          <button
            onClick={addSession}
            style={{
              flex: 1,
              padding: "12px 14px",
              borderRadius: 10,
              border: "none",
              background: "#111",
              color: "white",
              fontWeight: 700,
            }}
          >
            Save session
          </button>

          <button
            onClick={clearAll}
            style={{
              padding: "12px 14px",
              borderRadius: 10,
              border: "1px solid #ccc",
              background: "#f5f5f5",
              fontWeight: 700,
            }}
          >
            Clear all
          </button>
        </div>
      </div>

      <h2 style={{ marginTop: 22 }}>My sessions</h2>

      {sortedSessions.length === 0 ? (
        <p>No sessions logged yet.</p>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {sortedSessions.map((s) => (
            <div
              key={s.id}
              style={{
                border: "1px solid #e3e3e3",
                borderRadius: 10,
                padding: 12,
                background: "white",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 800 }}>{s.discipline}</div>
                  <div style={{ color: "#666", fontSize: 13 }}>{s.date}</div>
                </div>

                <button
                  onClick={() => deleteSession(s.id)}
                  style={{
                    border: "1px solid #ddd",
                    background: "#fff",
                    borderRadius: 8,
                    padding: "8px 10px",
                    cursor: "pointer",
                  }}
                  aria-label="Delete session"
                >
                  Delete
                </button>
              </div>

              <div style={{ marginTop: 10, whiteSpace: "pre-wrap" }}>{s.notes}</div>
            </div>
          ))}
        </div>
      )}

      <p style={{ marginTop: 18, fontSize: 12, color: "#666" }}>
        Tip: This is saved locally on this device only. Later we can add accounts so it syncs across phones.
      </p>
    </div>
  );
}
``
