# PulseHub

PulseHub is a real-time classroom discussion system for teacher-managed discussion spaces. Teachers create their own discussions, students join by link, and the teacher can monitor group ideas and control the sharing flow.

## Project

The active probe lives in [`Class Discussion Probe System`](/Users/qingshi/Desktop/Project/ClassDiscussion/PulseHub/Class%20Discussion%20Probe%20System).

## Local Development

### Backend

```bash
cd "/Users/qingshi/Desktop/Project/ClassDiscussion/PulseHub/Class Discussion Probe System/backend"
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

Local backend default:

- `http://127.0.0.1:5050`

The backend now includes:

- `gevent`
- `gevent-websocket`
- `gunicorn`

Flask-SocketIO is configured to auto-select the best available async backend. If `gevent` is installed, it will be used automatically.

### Frontend

Open a second terminal:

```bash
cd "/Users/qingshi/Desktop/Project/ClassDiscussion/PulseHub/Class Discussion Probe System/frontend"
npm install
npm run dev
```

Local frontend default:

- `http://127.0.0.1:5173`

During development:

- Vite proxies `/api` and `/socket.io` to the backend
- Vite listens on `0.0.0.0`
- you can also open the app from another device using your computer's LAN IP

## Current App Flow

### Teacher

- `/register` or `/login`
- `/dashboard`
- create a discussion
- open `/discussions/:id/manage`
- open `/discussions/:id/share` for the sharing view

### Student

- students join with `/join/:token`
- before entering the group space, they must provide:
  - `Your name`
  - `Group name`
  - `Group size`
- after entering, they can post cards for their group

### Notes

- the student-side `group size` is persisted to the backend, not just stored in the browser
- the local SQLite database is [`probe.db`](/Users/qingshi/Desktop/Project/ClassDiscussion/PulseHub/Class%20Discussion%20Probe%20System/backend/probe.db)

## Production Deployment

Current deployed server:

- public URL: [http://111.230.243.180](http://111.230.243.180)
- API check: [http://111.230.243.180/api/me](http://111.230.243.180/api/me)

Current production stack:

- Ubuntu
- Nginx
- Flask
- Flask-SocketIO
- `gunicorn`
- `geventwebsocket` worker
- SQLite

### Server Paths

- backend: `/home/ubuntu/class-discussion-app/backend`
- frontend static files: `/var/www/class-discussion-app/frontend`
- systemd service: `/etc/systemd/system/class-discussion.service`
- nginx site config: `/etc/nginx/sites-available/class-discussion`

### Backend Service Command

The backend now runs with:

```bash
/home/ubuntu/class-discussion-app/backend/.venv/bin/gunicorn \
  -k geventwebsocket.gunicorn.workers.GeventWebSocketWorker \
  -w 1 \
  -b 127.0.0.1:5050 \
  app:app
```

### Common Server Commands

```bash
sudo systemctl status class-discussion
sudo systemctl restart class-discussion
sudo journalctl -u class-discussion -n 100 --no-pager

sudo systemctl status nginx
sudo systemctl restart nginx
sudo nginx -t
```

## Capacity Estimate

For the current stack:

- `20-30` users: generally safe
- `40-60` users: suitable for classroom probe use
- `80` users: possible, but should be tested first
- `100` users: usable for trial runs, but not a stable production guarantee

Current bottlenecks are more likely to be:

- SQLite concurrent writes
- real-time update pressure during peak submission moments
- single-server deployment

## Environment Notes

- if you are not using the Vite dev proxy, set `VITE_API_URL`
- if your backend is on another machine during local development, set `VITE_BACKEND_TARGET`
