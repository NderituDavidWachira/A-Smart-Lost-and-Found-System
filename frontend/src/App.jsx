import { useEffect, useState, useCallback, useRef } from "react";
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

function FullScreenMessage({ children }) {
  return (
    <div className="auth-shell">
      <div className="loading-text" style={{ color: "#e9e6dd", textAlign: "center" }}>
        {children}
      </div>
    </div>
  );
}

function AuthenticatedApp({ isAdmin }) {
  const { token } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);

  const refreshUnread = useCallback(() => {
    if (isAdmin) return;
    api
      .notifications(token)
      .then((notes) => setUnreadCount(notes.filter((n) => !n.is_read).length))
      .catch(() => {});
    api
      .myConversations(token)
      .then((convos) => setUnreadMessages(convos.reduce((sum, c) => sum + c.unread_count, 0)))
      .catch(() => {});
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
        {/* A student can never open the admin page */}
        <Route path="/admin" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

function Root() {
  const { user, token, loading, login, logout } = useAuth();

  // { token, user } once the SERVER has confirmed who this token belongs to.
  const [verified, setVerified] = useState(null);
  const [netError, setNetError] = useState("");
  const [attempt, setAttempt] = useState(0);

  // Refs so the effect below doesn't re-run when these functions change identity.
  const userRef = useRef(user);
  const loginRef = useRef(login);
  const logoutRef = useRef(logout);
  userRef.current = user;
  loginRef.current = login;
  logoutRef.current = logout;

  useEffect(() => {
    if (loading || !token) return;

    let cancelled = false;
    setNetError("");

    api
      .me(token)
      .then((fresh) => {
        if (cancelled) return;
        setVerified({ token, user: fresh });

        // If the saved user doesn't match the server's answer, correct it.
        const saved = userRef.current;
        if (!saved || saved.id !== fresh.id || saved.role !== fresh.role) {
          loginRef.current(token, fresh);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        if (String(err.message).startsWith("Cannot reach")) {
          setNetError(err.message); // offline or server down: keep the session, offer retry
        } else {
          logoutRef.current(); // invalid or expired token
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token, loading, attempt]);

  // Clear the verified result when logged out
  useEffect(() => {
    if (!token) setVerified(null);
  }, [token]);

  if (loading) return <FullScreenMessage>Loading…</FullScreenMessage>;

  if (!token) return <AuthPage />;

  if (netError) {
    return (
      <FullScreenMessage>
        <p>{netError}</p>
        <button type="button" className="btn btn-gold" onClick={() => setAttempt((a) => a + 1)}>
          Try again
        </button>
      </FullScreenMessage>
    );
  }

  // Wait for the server to confirm the role before showing any dashboard.
  if (!verified || verified.token !== token) {
    return <FullScreenMessage>Loading…</FullScreenMessage>;
  }

  return <AuthenticatedApp isAdmin={verified.user.role === "admin"} />;
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