/**
 * All routes of the app.
 *
 * /login and /register are public. Everything nested inside
 * <ProtectedRoute> requires a valid token; add `roles={[...]}` to a nested
 * route group when a screen is for one role only.
 */
import { Outlet, Route, Routes } from "react-router-dom";

import Navbar from "./components/Navbar.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import LessonDetailPage from "./pages/LessonDetailPage.jsx";
import LessonEditorPage from "./pages/LessonEditorPage.jsx";
import LessonsPage from "./pages/LessonsPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import MyScoresPage from "./pages/MyScoresPage.jsx";
import NotFoundPage from "./pages/NotFoundPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import SubjectsPage from "./pages/SubjectsPage.jsx";
import UsersPage from "./pages/UsersPage.jsx";

/** Shared shell for logged-in screens: navbar on top, page below. */
function AppLayout() {
  return (
    <div className="min-h-dvh">
      <Navbar />
      <main>
        <Outlet />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Requires a login */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />

          <Route path="subjects" element={<SubjectsPage />} />

          <Route path="lessons" element={<LessonsPage />} />
          <Route path="lessons/:id" element={<LessonDetailPage />} />

          {/* Writing a lesson is for teachers and admins. The API enforces
              this too, including that a teacher owns the lesson. */}
          <Route element={<ProtectedRoute roles={["teacher", "admin"]} />}>
            <Route path="lessons/new" element={<LessonEditorPage />} />
            <Route path="lessons/:id/edit" element={<LessonEditorPage />} />
          </Route>

          {/* A student's own scores. Any signed-in person may open it: the
              server only ever returns the caller's own results. */}
          <Route path="scores" element={<MyScoresPage />} />

          {/* Managing accounts is the admin's job alone. */}
          <Route element={<ProtectedRoute roles={["admin"]} />}>
            <Route path="users" element={<UsersPage />} />
          </Route>

          {/* Search and quizzes arrive in phases 3 and 4. */}
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
