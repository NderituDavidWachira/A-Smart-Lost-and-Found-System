import { useEffect, useState, useCallback } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./AuthContext";
import { api } from "./api";
import Layout from "./components/Layout";
import AuthPage from "./pages/AuthPage";
import BrowsePage from "./pages/BrowsePage";
import ReportPage from "./pages/ReportPage";
import NotificationsPage from "./pages/NotificationsPage";
import AdminPage from "./pages/AdminPage";

function AuthenticatedApp() {
  const { token } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnread = useCallback(() => {
    api.notifications(token).then((notes) => {
      setUnreadCount(notes.filter((n) => !n.is_read).length);
    });
  }, [token]);

  useEffect(() => {
    refreshUnread();
    const interval = setInterval(refreshUnread, 15000);
    return () => clearInterval(interval);
  }, [refreshUnread]);

  return (
    <Layout unreadCount={unreadCount}>
      <Routes>
        <Route path="/" element={<BrowsePage />} />
        <Route path="/report" element={<ReportPage />} />
        <Route path="/notifications" element={<NotificationsPage onChange={refreshUnread} />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

function Root() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="auth-shell">
        <div className="loading-text" style={{ color: "#e9e6dd" }}>
          Loading…
        </div>
      </div>
    );
  }

  return user ? <AuthenticatedApp /> : <AuthPage />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Root />
      </AuthProvider>
    </BrowserRouter>
  );
}
