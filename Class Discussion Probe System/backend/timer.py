from __future__ import annotations

import threading
import time
from datetime import datetime, timedelta

from models import Session, SessionLocal


def compute_seconds_remaining(session: Session) -> int:
    if not session.timer_started_at:
        return session.timer_duration
    elapsed = datetime.utcnow() - session.timer_started_at
    remaining = session.timer_duration - int(elapsed.total_seconds())
    return max(remaining, 0)


def build_discussion_payload(session: Session) -> dict:
    selected = [idea for idea in session.ideas if idea.is_selected]
    selected.sort(key=lambda item: (item.share_order is None, item.share_order or 0, item.submitted_at))
    return {
        "selected_ideas": [
            {
                "id": idea.id,
                "session_id": idea.session_id,
                "group_id": idea.group_id,
                "author_name": idea.author_name,
                "content": idea.content,
                "submitted_at": idea.submitted_at.isoformat(),
                "is_selected": idea.is_selected,
                "share_order": idea.share_order,
            }
            for idea in selected
        ]
    }


def start_timer_thread(app, socketio):
    def worker():
        while True:
            with app.app_context():
                db = SessionLocal()
                try:
                    active_sessions = db.query(Session).filter(Session.timer_running.is_(True)).all()
                    now = datetime.utcnow()
                    for session in active_sessions:
                        seconds_remaining = compute_seconds_remaining(session)
                        socketio.emit(
                            "timer_update",
                            {
                                "timer_running": session.timer_running,
                                "seconds_remaining": seconds_remaining,
                            },
                            room=session.id,
                        )
                        if seconds_remaining <= 0:
                            session.timer_running = False
                            session.timer_started_at = now - timedelta(seconds=session.timer_duration)
                            session.discussion_ended = True
                            db.commit()
                            db.refresh(session)
                            socketio.emit(
                                "discussion_ended",
                                build_discussion_payload(session),
                                room=session.id,
                            )
                finally:
                    db.close()
            time.sleep(1)

    thread = threading.Thread(target=worker, daemon=True)
    thread.start()
    return thread
