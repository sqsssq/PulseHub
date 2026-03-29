import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getMe } from "../api/client";

export default function RequireAuth({ children }) {
  const location = useLocation();
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let mounted = true;
    getMe()
      .then((data) => {
        if (!mounted) {
          return;
        }
        setStatus(data.user ? "authenticated" : "unauthenticated");
      })
      .catch(() => {
        if (!mounted) {
          return;
        }
        setStatus("unauthenticated");
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (status === "loading") {
    return <main className="page-loading">Checking your session...</main>;
  }

  if (status === "unauthenticated") {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}
