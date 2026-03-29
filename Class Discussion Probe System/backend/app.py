from __future__ import annotations

import json
import random
from datetime import datetime

from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_socketio import SocketIO, join_room

from models import Idea, Session, SessionLocal, init_db
from timer import build_discussion_payload, compute_seconds_remaining, start_timer_thread

ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
CURRENT_SESSION_ID = "ROOMA1"
DEFAULT_TOPIC = "Discuss today's classroom prompt."
DEFAULT_PORT = 5050
app = Flask(__name__)
app.config["SECRET_KEY"] = "probe-secret"
CORS(
    app,
    resources={r"/api/*": {"origins": [r"http://localhost:\d+", r"http://127\.0\.0\.1:\d+"]}},
    allow_headers=["Content-Type"],
    methods=["GET", "POST", "PATCH", "OPTIONS"],
)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")

init_db()


def get_or_create_current_session(db):
    session = db.query(Session).filter_by(id=CURRENT_SESSION_ID).first()
    if session:
        return session

    session = Session(
        id=CURRENT_SESSION_ID,
        topic=DEFAULT_TOPIC,
        groups=json.dumps([]),
        timer_duration=10 * 60,
        timer_started_at=None,
        timer_running=False,
        discussion_ended=False,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def serialize_idea(idea: Idea) -> dict:
    return {
        "id": idea.id,
        "session_id": idea.session_id,
        "group_id": idea.group_id,
        "author_name": idea.author_name,
        "content": idea.content,
        "submitted_at": idea.submitted_at.isoformat(),
        "is_selected": idea.is_selected,
        "share_order": idea.share_order,
    }


def serialize_session(session: Session) -> dict:
    now = datetime.utcnow()
    seconds_remaining = compute_seconds_remaining(session)
    if not session.timer_running and not session.timer_started_at:
        seconds_remaining = session.timer_duration
    elif session.discussion_ended:
        seconds_remaining = 0
    return {
        "id": session.id,
        "topic": session.topic,
        "groups": json.loads(session.groups),
        "timer_duration": session.timer_duration,
        "timer_started_at": session.timer_started_at.isoformat() if session.timer_started_at else None,
        "timer_running": session.timer_running,
        "discussion_ended": session.discussion_ended,
        "created_at": session.created_at.isoformat(),
        "seconds_remaining": max(seconds_remaining, 0),
        "server_time": now.isoformat(),
        "ideas": [serialize_idea(idea) for idea in session.ideas],
    }


def generate_code(db) -> str:
    while True:
        code = "".join(random.choice(ALPHABET) for _ in range(6))
        exists = db.query(Session).filter_by(id=code).first()
        if not exists:
            return code


@app.get("/health")
def health():
    return jsonify({"ok": True})


@app.post("/api/sessions")
def create_session():
    payload = request.get_json(force=True)
    topic = (payload.get("topic") or "").strip()
    groups = payload.get("groups") or []
    timer_minutes = int(payload.get("timer_minutes") or 10)
    if not topic:
        return jsonify({"error": "Topic is required"}), 400
    if not groups:
        return jsonify({"error": "At least one group is required"}), 400

    db = SessionLocal()
    try:
        session = Session(
            id=generate_code(db),
            topic=topic,
            groups=json.dumps(groups),
            timer_duration=max(timer_minutes, 1) * 60,
            timer_started_at=None,
            timer_running=False,
            discussion_ended=False,
        )
        db.add(session)
        db.commit()
        db.refresh(session)
        return jsonify(serialize_session(session)), 201
    finally:
        db.close()


@app.get("/api/session/current")
def get_current_session():
    db = SessionLocal()
    try:
        session = get_or_create_current_session(db)
        return jsonify(serialize_session(session))
    finally:
        db.close()


@app.patch("/api/session/current")
def update_current_session():
    db = SessionLocal()
    try:
        session = get_or_create_current_session(db)
        return _update_session_from_payload(db, session, request.get_json(force=True))
    finally:
        db.close()


@app.get("/api/sessions/<code>")
def get_session(code: str):
    db = SessionLocal()
    try:
        session = db.query(Session).filter_by(id=code.upper()).first()
        if not session:
            return jsonify({"error": "Session not found"}), 404
        return jsonify(serialize_session(session))
    finally:
        db.close()


@app.patch("/api/sessions/<code>")
def update_session(code: str):
    db = SessionLocal()
    try:
        session = db.query(Session).filter_by(id=code.upper()).first()
        if not session:
            return jsonify({"error": "Session not found"}), 404
        return _update_session_from_payload(db, session, request.get_json(force=True))
    finally:
        db.close()


def _update_session_from_payload(db, session: Session, payload: dict):
    now = datetime.utcnow()

    if "topic" in payload:
        session.topic = (payload.get("topic") or session.topic).strip() or session.topic
    if "timer_duration" in payload and not session.timer_running:
        session.timer_duration = max(int(payload["timer_duration"]), 1)
    if "groups" in payload:
        session.groups = json.dumps(payload.get("groups") or [])
    if "timer_running" in payload:
        desired_running = bool(payload["timer_running"])
        if desired_running and not session.timer_running:
            session.timer_started_at = now
            session.timer_running = True
        elif not desired_running and session.timer_running:
            elapsed = int((now - session.timer_started_at).total_seconds()) if session.timer_started_at else 0
            session.timer_duration = max(session.timer_duration - elapsed, 0)
            session.timer_started_at = None
            session.timer_running = False
        else:
            session.timer_running = desired_running
    if payload.get("reset_timer"):
        session.timer_started_at = None
        session.timer_running = False
        session.timer_duration = max(int(payload.get("timer_duration", session.timer_duration)), 1)
        session.discussion_ended = False
    if "discussion_ended" in payload:
        session.discussion_ended = bool(payload["discussion_ended"])
        if session.discussion_ended:
            session.timer_running = False
            session.timer_started_at = None

    db.commit()
    db.refresh(session)

    serialized_session = serialize_session(session)
    socketio.emit("session_updated", serialized_session, room=session.id)
    seconds_remaining = 0 if session.discussion_ended else compute_seconds_remaining(session)
    socketio.emit(
        "timer_update",
        {
            "timer_running": session.timer_running,
            "seconds_remaining": seconds_remaining,
        },
        room=session.id,
    )
    if session.discussion_ended:
        socketio.emit("discussion_ended", build_discussion_payload(session), room=session.id)
    return jsonify(serialized_session)


@app.post("/api/sessions/<code>/ideas")
def create_idea(code: str):
    payload = request.get_json(force=True)
    db = SessionLocal()
    try:
        session = db.query(Session).filter_by(id=code.upper()).first()
        if not session:
            return jsonify({"error": "Session not found"}), 404
        content = (payload.get("content") or "").strip()
        group_id = (payload.get("group_id") or "").strip()
        if not content or not group_id:
            return jsonify({"error": "Group and content are required"}), 400
        idea = Idea(
            session_id=session.id,
            group_id=group_id,
            author_name=(payload.get("author_name") or "").strip() or None,
            content=content[:300],
        )
        db.add(idea)
        db.commit()
        db.refresh(idea)
        db.refresh(session)
        serialized = serialize_idea(idea)
        socketio.emit("session_updated", serialize_session(session), room=session.id)
        socketio.emit("idea_added", serialized, room=session.id)
        return jsonify(serialized), 201
    finally:
        db.close()


@app.post("/api/session/current/ideas")
def create_current_idea():
    payload = request.get_json(force=True)
    db = SessionLocal()
    try:
        session = get_or_create_current_session(db)
        content = (payload.get("content") or "").strip()
        group_id = (payload.get("group_id") or "").strip()
        if not content or not group_id:
            return jsonify({"error": "Group and content are required"}), 400

        groups = json.loads(session.groups)
        if group_id not in groups:
            groups.append(group_id)
            session.groups = json.dumps(groups)

        idea = Idea(
            session_id=session.id,
            group_id=group_id,
            author_name=(payload.get("author_name") or "").strip() or None,
            content=content[:300],
        )
        db.add(idea)
        db.commit()
        db.refresh(idea)
        db.refresh(session)
        serialized = serialize_idea(idea)
        socketio.emit("session_updated", serialize_session(session), room=session.id)
        socketio.emit("idea_added", serialized, room=session.id)
        return jsonify(serialized), 201
    finally:
        db.close()


@app.patch("/api/ideas/<int:idea_id>")
def update_idea(idea_id: int):
    payload = request.get_json(force=True)
    db = SessionLocal()
    try:
        idea = db.query(Idea).filter_by(id=idea_id).first()
        if not idea:
            return jsonify({"error": "Idea not found"}), 404
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
            {
                "id": idea.id,
                "is_selected": idea.is_selected,
                "share_order": idea.share_order,
            },
            room=idea.session_id,
        )
        return jsonify(serialize_idea(idea))
    finally:
        db.close()


@socketio.on("join_session")
def handle_join_session(data):
    session_code = (data.get("session_code") or "").upper()
    if session_code:
        join_room(session_code)


start_timer_thread(app, socketio)


if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=DEFAULT_PORT, debug=True)
