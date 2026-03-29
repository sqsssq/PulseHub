from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text, create_engine, text
from sqlalchemy.orm import declarative_base, relationship, sessionmaker


Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(120), nullable=False)
    email = Column(String(255), nullable=False, unique=True, index=True)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    discussions = relationship("Discussion", back_populates="owner", cascade="all, delete-orphan")


class Discussion(Base):
    __tablename__ = "discussions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    topic = Column(Text, nullable=False)
    join_token = Column(String(16), nullable=False, unique=True, index=True)
    groups = Column(Text, nullable=False, default="[]")
    group_sizes = Column(Text, nullable=False, default="{}")
    selected_groups = Column(Text, nullable=False, default="[]")
    is_hidden = Column(Boolean, nullable=False, default=False)
    timer_duration = Column(Integer, nullable=False, default=600)
    timer_started_at = Column(DateTime, nullable=True)
    timer_running = Column(Boolean, nullable=False, default=False)
    discussion_ended = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    owner = relationship("User", back_populates="discussions")
    ideas = relationship(
        "Idea",
        back_populates="discussion",
        cascade="all, delete-orphan",
        order_by="Idea.submitted_at.asc()",
    )


class Idea(Base):
    __tablename__ = "discussion_ideas"

    id = Column(Integer, primary_key=True, autoincrement=True)
    discussion_id = Column(Integer, ForeignKey("discussions.id"), nullable=False, index=True)
    group_id = Column(String(120), nullable=False, index=True)
    author_name = Column(String(100), nullable=True)
    content = Column(Text, nullable=False)
    submitted_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    is_selected = Column(Boolean, nullable=False, default=False)
    share_order = Column(Integer, nullable=True)

    discussion = relationship("Discussion", back_populates="ideas")


engine = create_engine("sqlite:///probe.db", connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    with engine.begin() as connection:
        columns = {row[1] for row in connection.execute(text("PRAGMA table_info(discussions)")).fetchall()}
        if "group_sizes" not in columns:
            connection.execute(text("ALTER TABLE discussions ADD COLUMN group_sizes TEXT NOT NULL DEFAULT '{}'"))
        if "selected_groups" not in columns:
            connection.execute(text("ALTER TABLE discussions ADD COLUMN selected_groups TEXT NOT NULL DEFAULT '[]'"))
        if "is_hidden" not in columns:
            connection.execute(text("ALTER TABLE discussions ADD COLUMN is_hidden BOOLEAN NOT NULL DEFAULT 0"))
