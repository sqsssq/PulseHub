# PulseHub

PulseHub is a real-time classroom orchestration platform for small-group discussions. It helps instructors gain live awareness of group activity, understand discussion progress across teams, and make timely intervention decisions during class.

## Features
- Real-time overview of multiple discussion groups
- Visibility into group progress and participation
- Support for identifying active, struggling, or overlooked groups
- Actionable insights for teacher intervention and orchestration
- Scalable support for discussion-based classrooms

## Run The Probe System

The classroom probe lives in [`Class Discussion Probe System`](/Users/qingshi/Desktop/Project/ClassDiscussion/PulseHub/Class%20Discussion%20Probe%20System).

### 1. Start the backend

```bash
cd "/Users/qingshi/Desktop/Project/ClassDiscussion/PulseHub/Class Discussion Probe System/backend"
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

The backend runs on `http://127.0.0.1:5050`.

### 2. Start the frontend

Open a second terminal:

```bash
cd "/Users/qingshi/Desktop/Project/ClassDiscussion/PulseHub/Class Discussion Probe System/frontend"
npm install
npm run dev
```

The frontend runs on the Vite local URL, usually `http://127.0.0.1:5173` or `http://localhost:5173`.

### 3. Open the pages

- Student view: open `/`
- Teacher view: open `/admin`

Current interaction flow:

- Students open the root page, enter a `group name`, and then post cards into their shared group space
- Teachers open `/admin` to see all group cards in one dashboard

### Notes

- The probe uses SQLite and creates its local database at [`probe.db`](/Users/qingshi/Desktop/Project/ClassDiscussion/PulseHub/Class%20Discussion%20Probe%20System/backend/probe.db)
- The frontend defaults to `http://127.0.0.1:5050` for API requests
- If the backend is already running on another port, set `VITE_API_URL` before starting Vite
