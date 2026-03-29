import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Home() {
  const [code, setCode] = useState("");
  const [group, setGroup] = useState("Group 1");
  const navigate = useNavigate();

  return (
    <main className="shell shell--centered">
      <section className="panel panel--narrow">
        <h1>Class Discussion Probe System</h1>
        <p className="muted">Enter a session code to join as a student or teacher.</p>
        <label className="field">
          <span>Session code</span>
          <input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} maxLength={6} />
        </label>
        <label className="field">
          <span>Group name for student entry</span>
          <input value={group} onChange={(event) => setGroup(event.target.value)} />
        </label>
        <div className="button-row">
          <button type="button" className="button" onClick={() => navigate(`/session/${code}/student?group=${encodeURIComponent(group)}`)}>
            Join as student
          </button>
          <button type="button" className="button button--secondary" onClick={() => navigate(`/session/${code}/teacher`)}>
            Open teacher dashboard
          </button>
        </div>
        <button type="button" className="link-button" onClick={() => navigate("/session/create")}>
          Create a new session
        </button>
      </section>
    </main>
  );
}
