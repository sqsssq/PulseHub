from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text, create_engine
from sqlalchemy.orm import declarative_base, relationship, sessionmaker


Base = declarative_base()


class Session(Base):
    __tablename__ = "sessions"

    id = Column(String(6), primary_key=True)
    topic = Column(String(255), nullable=False)
    groups = Column(Text, nullable=False)
    timer_duration = Column(Integer, nullable=False, default=600)
    timer_started_at = Column(DateTime, nullable=True)
    timer_running = Column(Boolean, nullable=False, default=False)
    discussion_ended = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    ideas = relationship(
        "Idea",
        back_populates="session",
        cascade="all, delete-orphan",
        order_by="Idea.submitted_at.asc()",
    )


class Idea(Base):
    __tablename__ = "ideas"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String(6), ForeignKey("sessions.id"), nullable=False, index=True)
    group_id = Column(String(64), nullable=False, index=True)
    author_name = Column(String(100), nullable=True)
    content = Column(Text, nullable=False)
    submitted_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    is_selected = Column(Boolean, nullable=False, default=False)
    share_order = Column(Integer, nullable=True)

    session = relationship("Session", back_populates="ideas")


engine = create_engine("sqlite:///probe.db", connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
