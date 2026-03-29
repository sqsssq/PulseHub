import { Navigate, Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import DiscussionManage from "./pages/DiscussionManage";
import DiscussionShare from "./pages/DiscussionShare";
import JoinDiscussion from "./pages/JoinDiscussion";
import RequireAuth from "./components/RequireAuth";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <Dashboard />
          </RequireAuth>
        }
      />
      <Route
        path="/discussions/:id/manage"
        element={
          <RequireAuth>
            <DiscussionManage />
          </RequireAuth>
        }
      />
      <Route
        path="/discussions/:id/share"
        element={
          <RequireAuth>
            <DiscussionShare />
          </RequireAuth>
        }
      />
      <Route path="/join/:token" element={<JoinDiscussion />} />
      <Route path="/admin" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
