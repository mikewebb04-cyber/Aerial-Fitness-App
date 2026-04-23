import { useEffect, useState } from "react";

const STORAGE_KEY = "aerial_fitness_sessions_v1";

export default function App() {
  const [sessions, setSessions] = useState<string[]>([]);
  const [note, setNote] = useState("");

  // 1) Load saved sessions when the app starts
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setSessions(parsed);
        }
      }
    } catch (err) {
      // If something goes wrong (rare), we just start with empty sessions
      console.warn("Could not load saved sessions:", err);
    }
  }, []);

  // 2) Save sessions every time they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    } catch (err) {
      console.warn("Could not save sessions:", err);
    }
  }, [sessions]);

  function addSession() {
    const clean = note.trim();
    if (clean === "") return;

    // Put newest at the top
    setSessions([clean, ...sessions]);
    setNote("");
  }

  function clearAll() {
    const ok = confirm("Delete all saved sessions on this device?");
    if (!ok) return;
    setSessions([]);
    // also remove from storage
    localStorage.removeItem(STORAGE_KEY);
  }

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <h1>My Aerial Fitness Journey</h1>

      <h2>Log a training session</h2>

      <textarea
        placeholder="What did you work on today?"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        style={{ width: "100%", height: "80px" }}
      />

      <br />
      <br />

      <button onClick={addSession}>Save session</button>

      <span style={{ marginLeft: "10px" }} />

      <button onClick={clearAll} style={{ background: "#eee" }}>
        Clear all
      </button>

      <h2>My sessions</h2>

      {sessions.length === 0 && <p>No sessions logged yet.</p>}

      <ul>
        {sessions.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ul>

      <p style={{ fontSize: "12px", color: "#666" }}>
        Saved on this device only (refresh-safe). Installing on another phone will
        not copy sessions yet.
      </p>
    </div>
  );
}