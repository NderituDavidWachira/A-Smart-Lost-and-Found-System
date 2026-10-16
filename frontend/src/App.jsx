import { useEffect, useState, useCallback } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./AuthContext";
import { api } from "./api";
import Layout from "./components/Layout";
import AuthPage from "./pages/AuthPage";
import BrowsePage from "./pages/BrowsePage";
import ReportPage from "./pages/ReportPage";
import NotificationsPage from "./pages/NotificationsPage";
import MessagesPage from "./pages/MessagesPage";
import AdminPage from "./pages/AdminPage";

function AuthenticatedApp() {
  const { token, user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);

  const refreshUnread = useCallback(() => {
    if (isAdmin) return;
    api.notifications(token).then((notes) => {
      setUnreadCount(notes.filter((n) => !n.is_read).length);
    });
    api.myConversations(token).then((convos) => {
      setUnreadMessages(convos.reduce((sum, c) => sum + c.unread_count, 0));
    });
  }, [token, isAdmin]);

  useEffect(() => {
    if (isAdmin) return;
    refreshUnread();
    const interval = setInterval(refreshUnread, 15000);
    return () => clearInterval(interval);
  }, [refreshUnread, isAdmin]);

  if (isAdmin) {
    return (
      <Layout>
        <Routes>
          <Route path="/admin" element={<AdminPage />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </Layout>
    );
  }

  return (
    <Layout unreadCount={unreadCount} unreadMessages={unreadMessages}>
      <Routes>
        <Route path="/" element={<BrowsePage />} />
        <Route path="/report" element={<ReportPage />} />
        <Route path="/messages" element={<MessagesPage onChange={refreshUnread} />} />
        <Route path="/notifications" element={<NotificationsPage onChange={refreshUnread} />} />
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