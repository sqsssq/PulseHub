from __future__ import annotations

import json
import random
import uuid
from pathlib import Path
from datetime import datetime
from functools import wraps

from flask import Flask, jsonify, request, send_from_directory, session as auth_session
from flask_cors import CORS
from flask_socketio import SocketIO, join_room
from werkzeug.security import check_password_hash, generate_password_hash

from models import Discussion, Idea, SessionLocal, User, init_db
from timer import (
    build_discussion_payload,
    compute_seconds_remaining,
    serialize_discussion,
    start_timer_thread,
)

TOKEN_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
DEFAULT_PORT = 5050
BASE_DIR = Path(__file__).resolve().parent
UPLOAD_DIR = BASE_DIR / "uploads"
IMAGE_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "webp"}
DOCUMENT_EXTENSIONS = {"pdf", "docx", "pptx"}
ALLOWED_UPLOAD_EXTENSIONS = IMAGE_EXTENSIONS | DOCUMENT_EXTENSIONS

app = Flask(__name__)
app.config["SECRET_KEY"] = "probe-secret"
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
app.config["MAX_CONTENT_LENGTH"] = 25 * 1024 * 1024
CORS(
    app,
    supports_credentials=True,
    resources={r"/api/*": {"origins": [r"http://localhost:\d+", r"http://127\.0\.0\.1:\d+", r"http://(?:\d{1,3}\.){3}\d{1,3}:\d+"]}},
    allow_headers=["Content-Type"],
    methods=["GET", "POST", "PATCH", "OPTIONS"],
)
# Let Flask-SocketIO choose the best available async backend.
# On servers with gevent installed, this will avoid falling back to threading.
socketio = SocketIO(app, cors_allowed_origins="*")

init_db()
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def serialize_user(user: User) -> dict:
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "created_at": user.created_at.isoformat(),
    }


def serialize_idea(idea: Idea) -> dict:
    return {
        "id": idea.id,
        "discussion_id": idea.discussion_id,
        "group_id": idea.group_id,
        "author_name": idea.author_name,
        "content": idea.content,
        "attachments": json.loads(idea.attachments or "[]"),
        "submitted_at": idea.submitted_at.isoformat(),
        "is_selected": idea.is_selected,
        "share_order": idea.share_order,
    }


def save_uploaded_files(files) -> list[dict]:
    attachments = []
    for file_storage in files:
        if not file_storage or not file_storage.filename:
            continue

        original_name = Path(file_storage.filename).name.strip()
        if not original_name or "." not in original_name:
            raise ValueError("Each upload must have a valid filename")

        extension = original_name.rsplit(".", 1)[1].lower()
        if extension not in ALLOWED_UPLOAD_EXTENSIONS:
            raise ValueError("Only images, PDF, DOCX, and PPTX files are supported")

        stored_name = f"{uuid.uuid4().hex}.{extension}"
        destination = UPLOAD_DIR / stored_name
        file_storage.save(destination)
        attachments.append(
            {
                "name": original_name,
                "url": f"/api/uploads/{stored_name}",
                "kind": "image" if extension in IMAGE_EXTENSIONS else "document",
                "extension": extension,
            }
        )
    return attachments


def serialize_discussion_for_owner(discussion: Discussion) -> dict:
    payload = serialize_discussion(discussion)
    payload["join_url_path"] = f"/join/{discussion.join_token}"
    return payload


def generate_token(db) -> str:
    while True:
        token = "".join(random.choice(TOKEN_ALPHABET) for _ in range(10))
        exists = db.query(Discussion).filter_by(join_token=token).first()
        if not exists:
            return token


def current_user_id():
    return auth_session.get("user_id")


def require_auth(handler):
    @wraps(handler)
    def wrapped(*args, **kwargs):
        if not current_user_id():
            return jsonify({"error": "Authentication required"}), 401
        return handler(*args, **kwargs)

    return wrapped


def get_owned_discussion(db, discussion_id: int):
    return (
        db.query(Discussion)
        .filter(Discussion.id == discussion_id, Discussion.owner_id == current_user_id())
        .first()
    )


def apply_discussion_updates(db, discussion: Discussion, payload: dict):
    now = datetime.utcnow()

    if "title" in payload:
        discussion.title = (payload.get("title") or discussion.title).strip() or discussion.title
    if "topic" in payload:
        discussion.topic = (payload.get("topic") or discussion.topic).strip() or discussion.topic
    if "timer_duration" in payload and not discussion.timer_running:
        discussion.timer_duration = max(int(payload["timer_duration"]), 1)
    if "groups" in payload:
        discussion.groups = json.dumps(payload.get("groups") or [])
    if "group_sizes" in payload:
        discussion.group_sizes = json.dumps(payload.get("group_sizes") or {})
    if "selected_groups" in payload:
        discussion.selected_groups = json.dumps(payload.get("selected_groups") or [])
    if "timer_running" in payload:
        desired_running = bool(payload["timer_running"])
        if desired_running and not discussion.timer_running:
            discussion.timer_started_at = now
            discussion.timer_running = True
        elif not desired_running and discussion.timer_running:
            elapsed = int((now - discussion.timer_started_at).total_seconds()) if discussion.timer_started_at else 0
            discussion.timer_duration = max(discussion.timer_duration - elapsed, 0)
            discussion.timer_started_at = None
            discussion.timer_running = False
        else:
            discussion.timer_running = desired_running
    if payload.get("reset_timer"):
        discussion.timer_started_at = None
        discussion.timer_running = False
        discussion.timer_duration = max(int(payload.get("timer_duration", discussion.timer_duration)), 1)
        discussion.discussion_ended = False
    if payload.get("resume_discussion"):
        discussion.discussion_ended = False
        discussion.timer_duration = max(int(payload.get("timer_duration", discussion.timer_duration)), 1)
        discussion.timer_started_at = now
        discussion.timer_running = True
    if payload.get("restart_discussion"):
        discussion.discussion_ended = False
        discussion.timer_duration = max(int(payload.get("timer_duration", discussion.timer_duration)), 1)
        discussion.timer_started_at = now
        discussion.timer_running = True
    if "discussion_ended" in payload:
        discussion.discussion_ended = bool(payload["discussion_ended"])
        if discussion.discussion_ended:
            discussion.timer_running = False
            discussion.timer_started_at = None

    db.commit()
    db.refresh(discussion)

    serialized = serialize_discussion_for_owner(discussion)
    socketio.emit("session_updated", serialized, room=str(discussion.id))
    seconds_remaining = 0 if discussion.discussion_ended else compute_seconds_remaining(discussion)
    socketio.emit(
        "timer_update",
        {"timer_running": discussion.timer_running, "seconds_remaining": seconds_remaining},
        room=str(discussion.id),
    )
    if discussion.discussion_ended:
        socketio.emit("discussion_ended", build_discussion_payload(discussion), room=str(discussion.id))
    return serialized


@app.get("/health")
def health():
    return jsonify({"ok": True})


@app.get("/api/uploads/<path:filename>")
def serve_upload(filename: str):
    return send_from_directory(UPLOAD_DIR, filename, as_attachment=False)


@app.post("/api/auth/register")
def register():
    payload = request.get_json(force=True)
    name = (payload.get("name") or "").strip()
    email = (payload.get("email") or "").strip().lower()
    password = payload.get("password") or ""
    if not name or not email or len(password) < 6:
        return jsonify({"error": "Name, email, and password (min 6 chars) are required"}), 400

    db = SessionLocal()
    try:
        if db.query(User).filter_by(email=email).first():
            return jsonify({"error": "Email already registered"}), 400
        user = User(
            name=name,
            email=email,
            password_hash=generate_password_hash(password, method="pbkdf2:sha256"),
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        auth_session["user_id"] = user.id
        return jsonify({"user": serialize_user(user)}), 201
    finally:
        db.close()


@app.post("/api/auth/login")
def login():
    payload = request.get_json(force=True)
    email = (payload.get("email") or "").strip().lower()
    password = payload.get("password") or ""
    db = SessionLocal()
    try:
        user = db.query(User).filter_by(email=email).first()
        if not user or not check_password_hash(user.password_hash, password):
            return jsonify({"error": "Invalid email or password"}), 401
        auth_session["user_id"] = user.id
        return jsonify({"user": serialize_user(user)})
    finally:
        db.close()


@app.post("/api/auth/logout")
def logout():
    auth_session.clear()
    return jsonify({"ok": True})


@app.get("/api/me")
def me():
    user_id = current_user_id()
    if not user_id:
        return jsonify({"user": None})
    db = SessionLocal()
    try:
        user = db.query(User).filter_by(id=user_id).first()
        return jsonify({"user": serialize_user(user) if user else None})
    finally:
        db.close()


@app.get("/api/discussions")
@require_auth
def list_discussions():
    db = SessionLocal()
    try:
        discussions = (
            db.query(Discussion)
            .filter(Discussion.owner_id == current_user_id(), Discussion.is_hidden.is_(False))
            .order_by(Discussion.created_at.desc())
            .all()
        )
        return jsonify({"discussions": [serialize_discussion_for_owner(d) for d in discussions]})
    finally:
        db.close()


@app.post("/api/discussions")
@require_auth
def create_discussion():
    payload = request.get_json(force=True)
    title = (payload.get("title") or "").strip()
    topic = (payload.get("topic") or "").strip()
    timer_minutes = int(payload.get("timer_minutes") or 10)
    if not title or not topic:
        return jsonify({"error": "Title and topic are required"}), 400

    db = SessionLocal()
    try:
        discussion = Discussion(
            owner_id=current_user_id(),
            title=title,
            topic=topic,
            join_token=generate_token(db),
            groups=json.dumps([]),
            group_sizes=json.dumps({}),
            selected_groups=json.dumps([]),
            is_hidden=False,
            timer_duration=max(timer_minutes, 1) * 60,
        )
        db.add(discussion)
        db.commit()
        db.refresh(discussion)
        return jsonify(serialize_discussion_for_owner(discussion)), 201
    finally:
        db.close()


@app.get("/api/discussions/<int:discussion_id>")
@require_auth
def get_discussion(discussion_id: int):
    db = SessionLocal()
    try:
        discussion = get_owned_discussion(db, discussion_id)
        if not discussion:
            return jsonify({"error": "Discussion not found"}), 404
        return jsonify(serialize_discussion_for_owner(discussion))
    finally:
        db.close()


@app.patch("/api/discussions/<int:discussion_id>")
@require_auth
def update_discussion(discussion_id: int):
    payload = request.get_json(force=True)
    db = SessionLocal()
    try:
        discussion = get_owned_discussion(db, discussion_id)
        if not discussion:
            return jsonify({"error": "Discussion not found"}), 404
        return jsonify(apply_discussion_updates(db, discussion, payload))
    finally:
        db.close()


@app.delete("/api/discussions/<int:discussion_id>")
@require_auth
def delete_discussion(discussion_id: int):
    db = SessionLocal()
    try:
        discussion = get_owned_discussion(db, discussion_id)
        if not discussion:
            return jsonify({"error": "Discussion not found"}), 404
        discussion.is_hidden = True
        db.commit()
        return jsonify({"ok": True, "id": discussion_id})
    finally:
        db.close()


@app.post("/api/discussions/<int:discussion_id>/groups/select")
@require_auth
def select_discussion_group(discussion_id: int):
    payload = request.get_json(force=True)
    group_id = (payload.get("group_id") or "").strip()
    should_select = bool(payload.get("is_selected"))
    if not group_id:
        return jsonify({"error": "group_id is required"}), 400

    db = SessionLocal()
    try:
        discussion = get_owned_discussion(db, discussion_id)
        if not discussion:
            return jsonify({"error": "Discussion not found"}), 404

        ideas = (
            db.query(Idea)
            .filter(Idea.discussion_id == discussion_id, Idea.group_id == group_id)
            .order_by(Idea.submitted_at.asc())
            .all()
        )
        if not ideas:
            return jsonify({"error": "Group has no ideas"}), 404

        selected_groups = json.loads(discussion.selected_groups or "[]")
        if should_select and group_id not in selected_groups:
            selected_groups.append(group_id)
        if not should_select:
            selected_groups = [entry for entry in selected_groups if entry != group_id]
        discussion.selected_groups = json.dumps(selected_groups)

        for idea in ideas:
            idea.is_selected = should_select
            if not should_select:
                idea.share_order = None

        db.commit()
        db.refresh(discussion)
        serialized = serialize_discussion_for_owner(discussion)
        socketio.emit("session_updated", serialized, room=str(discussion.id))
        return jsonify(serialized)
    finally:
        db.close()


@app.post("/api/discussions/<int:discussion_id>/groups/set-selected-ideas")
@require_auth
def set_discussion_group_selected_ideas(discussion_id: int):
    payload = request.get_json(force=True)
    group_id = (payload.get("group_id") or "").strip()
    selected_idea_ids = {int(value) for value in (payload.get("selected_idea_ids") or [])}
    if not group_id:
        return jsonify({"error": "group_id is required"}), 400

    db = SessionLocal()
    try:
        discussion = get_owned_discussion(db, discussion_id)
        if not discussion:
            return jsonify({"error": "Discussion not found"}), 404

        ideas = (
            db.query(Idea)
            .filter(Idea.discussion_id == discussion_id, Idea.group_id == group_id)
            .order_by(Idea.submitted_at.asc())
            .all()
        )
        if not ideas:
            return jsonify({"error": "Group has no ideas"}), 404

        valid_ids = {idea.id for idea in ideas}
        selected_idea_ids &= valid_ids

        selected_groups = [entry for entry in json.loads(discussion.selected_groups or "[]") if entry != group_id]
        discussion.selected_groups = json.dumps(selected_groups)

        for idea in ideas:
            if idea.id in selected_idea_ids:
                idea.is_selected = True
            else:
                idea.is_selected = False
                idea.share_order = None

        db.commit()
        db.refresh(discussion)
        serialized = serialize_discussion_for_owner(discussion)
        socketio.emit("session_updated", serialized, room=str(discussion.id))
        return jsonify(serialized)
    finally:
        db.close()


@app.get("/api/join/<token>")
def get_join_discussion(token: str):
    db = SessionLocal()
    try:
        discussion = db.query(Discussion).filter_by(join_token=token).first()
        if not discussion:
            return jsonify({"error": "Discussion not found"}), 404
        payload = serialize_discussion(discussion)
        payload["join_url_path"] = f"/join/{discussion.join_token}"
        return jsonify(payload)
    finally:
        db.close()


@app.post("/api/join/<token>/groups")
def register_join_group(token: str):
    payload = request.get_json(force=True)
    db = SessionLocal()
    try:
        discussion = db.query(Discussion).filter_by(join_token=token).first()
        if not discussion:
            return jsonify({"error": "Discussion not found"}), 404

        group_id = (payload.get("group_id") or "").strip()
        raw_group_size = payload.get("group_size")
        if not group_id:
            return jsonify({"error": "group_id is required"}), 400

        try:
            group_size = int(raw_group_size)
        except (TypeError, ValueError):
            return jsonify({"error": "group_size must be a number"}), 400

        if group_size < 1 or group_size > 50:
            return jsonify({"error": "group_size must be between 1 and 50"}), 400

        groups = json.loads(discussion.groups or "[]")
        group_sizes = json.loads(discussion.group_sizes or "{}")

        if group_id not in groups:
            groups.append(group_id)
            discussion.groups = json.dumps(groups)

        group_sizes[group_id] = group_size
        discussion.group_sizes = json.dumps(group_sizes)

        db.commit()
        db.refresh(discussion)
        serialized = serialize_discussion_for_owner(discussion)
        socketio.emit("session_updated", serialized, room=str(discussion.id))
        return jsonify(serialized)
    finally:
        db.close()


@app.post("/api/join/<token>/ideas")
def create_join_idea(token: str):
    if request.content_type and "multipart/form-data" in request.content_type:
        payload = request.form
        uploaded_files = request.files.getlist("files")
    else:
        payload = request.get_json(force=True)
        uploaded_files = []
    db = SessionLocal()
    try:
        discussion = db.query(Discussion).filter_by(join_token=token).first()
        if not discussion:
            return jsonify({"error": "Discussion not found"}), 404
        content = (payload.get("content") or "").strip()
        group_id = (payload.get("group_id") or "").strip()
        raw_group_size = payload.get("group_size")
        if not group_id:
            return jsonify({"error": "Group is required"}), 400

        groups = json.loads(discussion.groups)
        group_sizes = json.loads(discussion.group_sizes or "{}")
        selected_groups = json.loads(discussion.selected_groups or "[]")
        if group_id not in groups:
            groups.append(group_id)
            discussion.groups = json.dumps(groups)
        if raw_group_size not in (None, "", "null"):
            try:
                group_size = int(raw_group_size)
            except (TypeError, ValueError):
                return jsonify({"error": "group_size must be a number"}), 400
            if group_size < 1 or group_size > 50:
                return jsonify({"error": "group_size must be between 1 and 50"}), 400
            group_sizes[group_id] = group_size
            discussion.group_sizes = json.dumps(group_sizes)
        try:
            attachments = save_uploaded_files(uploaded_files)
        except ValueError as error:
            return jsonify({"error": str(error)}), 400
        if not content and not attachments:
            return jsonify({"error": "Please add text or upload at least one file"}), 400

        idea = Idea(
            discussion_id=discussion.id,
            group_id=group_id,
            author_name=(payload.get("author_name") or "").strip() or None,
            content=content[:300],
            attachments=json.dumps(attachments),
        )
        if group_id in selected_groups:
            max_share_order = (
                db.query(Idea.share_order)
                .filter(Idea.discussion_id == discussion.id, Idea.is_selected.is_(True), Idea.share_order.isnot(None))
                .order_by(Idea.share_order.desc())
                .first()
            )
            idea.is_selected = True
            idea.share_order = (max_share_order[0] if max_share_order else 0) + 1
        db.add(idea)
        db.commit()
        db.refresh(idea)
        db.refresh(discussion)
        serialized = serialize_idea(idea)
        socketio.emit("session_updated", serialize_discussion(discussion), room=str(discussion.id))
        socketio.emit("idea_added", serialized, room=str(discussion.id))
        return jsonify(serialized), 201
    finally:
        db.close()


@app.patch("/api/ideas/<int:idea_id>")
@require_auth
def update_idea(idea_id: int):
    payload = request.get_json(force=True)
    db = SessionLocal()
    try:
        idea = db.query(Idea).filter_by(id=idea_id).first()
        if not idea:
            return jsonify({"error": "Idea not found"}), 404
        discussion = get_owned_discussion(db, idea.discussion_id)
        if not discussion:
            return jsonify({"error": "Discussion not found"}), 404
        if "is_selected" in payload:
            idea.is_selected = bool(payload["is_selected"])
            if not idea.is_selected:
                idea.share_order = None
        if "share_order" in payload:
            value = payload["share_order"]
            idea.share_order = int(value) if value not in (None, "", "null") else None
        db.commit()
        db.refresh(idea)
        socketio.emit(
            "idea_updated",
            {"id": idea.id, "is_selected": idea.is_selected, "share_order": idea.share_order},
            room=str(idea.discussion_id),
        )
        return jsonify(serialize_idea(idea))
    finally:
        db.close()


@socketio.on("join_session")
def handle_join_session(data):
    room_id = str(data.get("session_code") or "")
    if room_id:
        join_room(room_id)


start_timer_thread(app, socketio)


if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=DEFAULT_PORT, debug=True)
