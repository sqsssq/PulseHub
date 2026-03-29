from __future__ import annotations

import threading
import time
from datetime import datetime, timedelta

from models import Discussion, SessionLocal


def compute_seconds_remaining(discussion: Discussion) -> int:
    if not discussion.timer_started_at:
        return discussion.timer_duration
    elapsed = datetime.utcnow() - discussion.timer_started_at
    remaining = discussion.timer_duration - int(elapsed.total_seconds())
    return max(remaining, 0)


def serialize_idea(idea) -> dict:
    return {
        "id": idea.id,
        "discussion_id": idea.discussion_id,
        "group_id": idea.group_id,
        "author_name": idea.author_name,
        "content": idea.content,
        "submitted_at": idea.submitted_at.isoformat(),
        "is_selected": idea.is_selected,
        "share_order": idea.share_order,
    }


def serialize_discussion(discussion: Discussion) -> dict:
    seconds_remaining = compute_seconds_remaining(discussion)
    if discussion.discussion_ended:
        seconds_remaining = 0
    return {
        "id": discussion.id,
        "owner_id": discussion.owner_id,
        "title": discussion.title,
        "topic": discussion.topic,
        "join_token": discussion.join_token,
        "groups": __import__("json").loads(discussion.groups),
        "group_sizes": __import__("json").loads(discussion.group_sizes or "{}"),
        "selected_groups": __import__("json").loads(discussion.selected_groups or "[]"),
        "is_hidden": discussion.is_hidden,
        "timer_duration": discussion.timer_duration,
        "timer_started_at": discussion.timer_started_at.isoformat() if discussion.timer_started_at else None,
        "timer_running": discussion.timer_running,
        "discussion_ended": discussion.discussion_ended,
        "created_at": discussion.created_at.isoformat(),
        "seconds_remaining": max(seconds_remaining, 0),
        "ideas": [serialize_idea(idea) for idea in discussion.ideas],
    }


def build_discussion_payload(discussion: Discussion) -> dict:
    selected = [idea for idea in discussion.ideas if idea.is_selected]
    selected.sort(key=lambda item: (item.share_order is None, item.share_order or 0, item.submitted_at))
    return {"selected_ideas": [serialize_idea(idea) for idea in selected]}


def start_timer_thread(app, socketio):
    def worker():
        while True:
            with app.app_context():
                db = SessionLocal()
                try:
                    active_discussions = db.query(Discussion).filter(Discussion.timer_running.is_(True)).all()
                    now = datetime.utcnow()
                    for discussion in active_discussions:
                        seconds_remaining = compute_seconds_remaining(discussion)
                        socketio.emit(
                            "timer_update",
                            {
                                "timer_running": discussion.timer_running,
                                "seconds_remaining": seconds_remaining,
                            },
                            room=str(discussion.id),
                        )
                        if seconds_remaining <= 0:
                            discussion.timer_running = False
                            discussion.timer_started_at = now - timedelta(seconds=discussion.timer_duration)
                            discussion.discussion_ended = True
                            db.commit()
                            db.refresh(discussion)
                            socketio.emit("session_updated", serialize_discussion(discussion), room=str(discussion.id))
                            socketio.emit("discussion_ended", build_discussion_payload(discussion), room=str(discussion.id))
                finally:
                    db.close()
            time.sleep(1)

    thread = threading.Thread(target=worker, daemon=True)
    thread.start()
    return thread
