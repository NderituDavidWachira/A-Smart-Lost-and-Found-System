import { useEffect, useState } from "react";
import { api } from "../api";
import { useAuth } from "../AuthContext";

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function NotificationsPage({ onChange }) {
  const { token } = useAuth();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  function load() {
    api
      .notifications(token)
      .then(setNotes)
      .finally(() => setLoading(false));
  }

  useEffect(load, [token]);

  async function markRead(id) {
    await api.markRead(id, token);
    setNotes((ns) => ns.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    onChange?.();
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Notifications</h1>
        <p className="page-lede">Alerts from the matching engine, claim updates, and admin decisions.</p>
      </div>

      {loading ? (
        <div className="loading-text">Loading notifications…</div>
      ) : notes.length === 0 ? (
        <div className="empty-state">Nothing here yet. You&apos;ll be notified the moment there&apos;s a match.</div>
      ) : (
        <div className="form-card" style={{ maxWidth: 640 }}>
          {notes.map((n) => (
            <div key={n.id} className={`notif-item${n.is_read ? " read" : ""}`}>
              <div className="notif-dot" />
              <div style={{ flex: 1 }}>
                <div className="notif-text">{n.message}</div>
                <div className="notif-time">{timeAgo(n.created_at)}</div>
              </div>
              {!n.is_read && (
                <button className="btn btn-sm btn-outline" onClick={() => markRead(n.id)}>
                  Mark read
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
