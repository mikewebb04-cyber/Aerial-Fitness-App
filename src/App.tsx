import { useState } from "react";

export default function App() {
  const [sessions, setSessions] = useState<string[]>([]);
  const [note, setNote] = useState("");

  function addSession() {
    if (note.trim() === "") return;
    setSessions([...sessions, note]);
    setNote("");
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

      <br /><br />

      <button onClick={addSession}>
        Save session
      </button>

      <h2>My sessions</h2>

      {sessions.length === 0 && (
        <p>No sessions logged yet.</p>
      )}

      <ul>
        {sessions.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ul>
    </div>
  );
}