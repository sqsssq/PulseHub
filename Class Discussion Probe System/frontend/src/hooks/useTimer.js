import { useEffect, useRef, useState } from "react";

export default function useTimer(initialSeconds = 0, running = false) {
  const [displaySeconds, setDisplaySeconds] = useState(initialSeconds);
  const lastSyncRef = useRef(Date.now());
  const secondsRef = useRef(initialSeconds);

  useEffect(() => {
    secondsRef.current = initialSeconds;
    setDisplaySeconds(initialSeconds);
    lastSyncRef.current = Date.now();
  }, [initialSeconds, running]);

  useEffect(() => {
    if (!running) {
      return undefined;
    }
    const interval = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - lastSyncRef.current) / 1000);
      setDisplaySeconds(Math.max(secondsRef.current - elapsed, 0));
    }, 250);
    return () => window.clearInterval(interval);
  }, [running]);

  return displaySeconds;
}
