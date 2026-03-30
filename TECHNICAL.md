# Technical Notes

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

Backend packages include:

- `gevent`
- `gevent-websocket`
- `gunicorn`

Flask-SocketIO is configured to auto-select the best available async backend. If `gevent` is installed, it will be used automatically.

### Frontend

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
- other devices on the same LAN can open the frontend through the machine IP

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

## Release Checklist

Release means updating the live server so users see your latest changes.

### Frontend Release

Use this when you only changed React pages, styles, or frontend interaction logic.

Local build:

```bash
cd "/Users/qingshi/Desktop/Project/ClassDiscussion/PulseHub/Class Discussion Probe System/frontend"
npm run build
cd dist
COPYFILE_DISABLE=1 tar -czf /tmp/class-discussion-frontend-dist.tar.gz .
```

Upload to server:

```bash
scp -o StrictHostKeyChecking=no /tmp/class-discussion-frontend-dist.tar.gz ubuntu@111.230.243.180:/home/ubuntu/
```

Replace live static files on the server:

```bash
ssh ubuntu@111.230.243.180
rm -rf /tmp/class-discussion-frontend-deploy
mkdir -p /tmp/class-discussion-frontend-deploy
cd /tmp/class-discussion-frontend-deploy && tar -xzf ~/class-discussion-frontend-dist.tar.gz
sudo mkdir -p /var/www/class-discussion-app/frontend
sudo cp -R /tmp/class-discussion-frontend-deploy/. /var/www/class-discussion-app/frontend/
sudo chown -R www-data:www-data /var/www/class-discussion-app/frontend
```

Verify:

```bash
curl -I http://127.0.0.1/
```

Notes:

- frontend static file updates normally do not require restarting nginx
- if you only replace files under `/var/www/class-discussion-app/frontend`, nginx can continue serving them directly

### Backend Release

Use this when you changed Flask routes, timer logic, Socket.IO behavior, auth, or data handling.

Optional local syntax check:

```bash
PYTHONPYCACHEPREFIX='/tmp/pulsehub-pyc' python3 -m py_compile \
  "/Users/qingshi/Desktop/Project/ClassDiscussion/PulseHub/Class Discussion Probe System/backend/app.py" \
  "/Users/qingshi/Desktop/Project/ClassDiscussion/PulseHub/Class Discussion Probe System/backend/models.py" \
  "/Users/qingshi/Desktop/Project/ClassDiscussion/PulseHub/Class Discussion Probe System/backend/timer.py"
```

Upload changed backend files:

```bash
scp -o StrictHostKeyChecking=no "/Users/qingshi/Desktop/Project/ClassDiscussion/PulseHub/Class Discussion Probe System/backend/app.py" ubuntu@111.230.243.180:/home/ubuntu/class-discussion-app/backend/app.py
scp -o StrictHostKeyChecking=no "/Users/qingshi/Desktop/Project/ClassDiscussion/PulseHub/Class Discussion Probe System/backend/models.py" ubuntu@111.230.243.180:/home/ubuntu/class-discussion-app/backend/models.py
scp -o StrictHostKeyChecking=no "/Users/qingshi/Desktop/Project/ClassDiscussion/PulseHub/Class Discussion Probe System/backend/timer.py" ubuntu@111.230.243.180:/home/ubuntu/class-discussion-app/backend/timer.py
scp -o StrictHostKeyChecking=no "/Users/qingshi/Desktop/Project/ClassDiscussion/PulseHub/Class Discussion Probe System/backend/requirements.txt" ubuntu@111.230.243.180:/home/ubuntu/class-discussion-app/backend/requirements.txt
```

Install dependencies and restart the service:

```bash
ssh ubuntu@111.230.243.180
cd ~/class-discussion-app/backend
source .venv/bin/activate
python -m pip install -r requirements.txt
sudo systemctl restart class-discussion
```

Verify:

```bash
sudo systemctl status class-discussion --no-pager -l
curl http://127.0.0.1:5050/health
```

### Nginx Or Proxy Release

Use this when you changed:

- domain or server_name
- `/api` or `/socket.io` proxy rules
- static root path
- HTTPS or certificates
- headers, cache rules, gzip, or other nginx behavior

Update nginx config and verify:

```bash
ssh ubuntu@111.230.243.180
sudo nginx -t
sudo systemctl reload nginx
```

Use `reload` when only the nginx config changed. Use `restart` only if you have a specific reason.

### Typical Safe Order

If one change touches both frontend and backend:

1. build and verify locally
2. release backend first
3. verify backend health
4. release frontend static files
5. open the live site and test the changed flow

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
