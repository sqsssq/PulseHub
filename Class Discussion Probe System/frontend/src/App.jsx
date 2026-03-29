import { Navigate, Route, Routes } from "react-router-dom";
import CreateSession from "./pages/CreateSession";
import StudentView from "./pages/StudentView";
import TeacherDashboard from "./pages/TeacherDashboard";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<StudentView />} />
      <Route path="/admin" element={<TeacherDashboard />} />
      <Route path="/session/create" element={<CreateSession />} />
      <Route path="/session/:code/student" element={<StudentView />} />
      <Route path="/session/:code/teacher" element={<TeacherDashboard />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
