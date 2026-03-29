import { QRCodeSVG } from "qrcode.react";
import { useMemo, useState } from "react";
import { createSession } from "../api/client";

function generateGroups(count) {
  return Array.from({ length: count }, (_, index) => `Group ${index + 1}`);
}

export default function CreateSession() {
  const [topic, setTopic] = useState("");
  const [groupCount, setGroupCount] = useState(4);
  const [groups, setGroups] = useState(generateGroups(4));
  const [minutes, setMinutes] = useState(10);
  const [created, setCreated] = useState(null);
  const [loading, setLoading] = useState(false);

  const origin = useMemo(() => window.location.origin, []);

  function handleCountChange(nextCount) {
    const safeCount = Math.max(1, Number(nextCount) || 1);
    setGroupCount(safeCount);
    setGroups((current) =>
      Array.from({ length: safeCount }, (_, index) => current[index] || `Group ${index + 1}`),
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    try {
      const session = await createSession({
        topic,
        groups,
        timer_minutes: minutes,
      });
      setCreated(session);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="shell">
      <section className="panel">
        <h1>Create Session</h1>
        <form className="form-grid" onSubmit={handleSubmit}>
          <label className="field field--full">
            <span>Discussion topic</span>
            <input value={topic} onChange={(event) => setTopic(event.target.value)} required />
          </label>
          <label className="field">
            <span>Number of groups</span>
            <input type="number" min="1" value={groupCount} onChange={(event) => handleCountChange(event.target.value)} />
          </label>
          <label className="field">
            <span>Timer duration (minutes)</span>
            <input type="number" min="1" value={minutes} onChange={(event) => setMinutes(Number(event.target.value) || 1)} />
          </label>
          <div className="field field--full">
            <span>Group names</span>
            <div className="group-name-grid">
              {groups.map((group, index) => (
                <input
                  key={index}
                  value={group}
                  onChange={(event) =>
                    setGroups((current) => current.map((item, idx) => (idx === index ? event.target.value : item)))
                  }
                />
              ))}
            </div>
          </div>
          <button className="button" type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create session"}
          </button>
        </form>
      </section>

      {created ? (
        <section className="panel">
          <h2>Session Created</h2>
          <p><strong>Teacher link:</strong> {origin}/session/{created.id}/teacher</p>
          <p><strong>Student chooser link:</strong> {origin}/session/{created.id}/student</p>
          <div className="qr-grid">
            {created.groups.map((group) => {
              const url = `${origin}/session/${created.id}/student?group=${encodeURIComponent(group)}`;
              return (
                <div className="qr-card" key={group}>
                  <QRCodeSVG value={url} size={128} />
                  <strong>{group}</strong>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}
    </main>
  );
}
