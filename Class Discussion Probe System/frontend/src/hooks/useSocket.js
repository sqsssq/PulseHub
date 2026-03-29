import { useEffect, useMemo, useRef } from "react";
import { io } from "socket.io-client";
import { BASE_URL } from "../api/client";

export default function useSocket(sessionCode, handlers = {}) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const socket = useMemo(() => {
    if (!sessionCode) {
      return null;
    }
    return io(BASE_URL, {
      path: "/socket.io",
      transports: ["polling", "websocket"],
    });
  }, [sessionCode]);

  useEffect(() => {
    if (!socket || !sessionCode) {
      return undefined;
    }

    const onConnect = () => {
      socket.emit("join_session", { session_code: sessionCode });
    };

    socket.on("connect", onConnect);
    socket.emit("join_session", { session_code: sessionCode });

    const events = ["idea_added", "idea_updated", "timer_update", "discussion_ended", "session_updated"];
    events.forEach((eventName) => {
      socket.on(eventName, (payload) => {
        const handler = handlersRef.current[eventName];
        if (handler) {
          handler(payload);
        }
      });
    });

    return () => {
      events.forEach((eventName) => socket.off(eventName));
      socket.off("connect", onConnect);
      socket.disconnect();
    };
  }, [sessionCode, socket]);

  return socket;
}
