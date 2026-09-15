import { useEffect, useState } from "react";
import { api } from "../api";
import { useAuth } from "../AuthContext";
import ItemCard from "../components/ItemCard";
import ClaimCard from "../components/ClaimCard";

export default function AdminPage() {
  const { token } = useAuth();
  const [view, setView] = useState("conversations");
  const [stats, setStats] = useState(null);

  const refreshStats = () => {
    api.adminStats(token).then(setStats).catch(console.error);
  };

  useEffect(() => {
    refreshStats();
  }, [token]);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Admin dashboard</h1>
        <p className="page-lede">Verify ownership claims and monitor recovery performance across campus.</p>
      </div>

      {stats && (
        <div className="stat-grid">
          <div className="stat-card">
            <span className="stat-value">{stats.total_items}</span>
            <span className="stat-label">Items reported</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{stats.recovery_rate}%</span>
            <span className="stat-label">Recovery rate</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{stats.returned_items}</span>
            <span className="stat-label">Items returned</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{stats.pending_claims}</span>
            <span className="stat-label">Pending claims</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{stats.total_users}</span>
            <span className="stat-label">Registered users</span>
          </div>
        </div>
      )}

      <div className="filter-row" style={{ marginBottom: 20 }}>
        <button
          className={`btn btn-sm ${view === "claims" ? "btn-primary" : "btn-outline"}`}
          onClick={() => setView("claims")}
        >
          Claims queue
        </button>
        <button
          className={`btn btn-sm ${view === "items" ? "btn-primary" : "btn-outline"}`}
          onClick={() => setView("items")}
        >
          All items
        </button>
        <button
          className={`btn btn-sm ${view === "conversations" ? "btn-primary" : "btn-outline"}`}
          onClick={() => setView("conversations")}
        >
          Conversations
        </button>
      </div>

      {view === "claims" && (
        <ClaimsQueue token={token} onStatsChange={refreshStats} />
      )}
      {view === "items" && <AllItems />}
      {view === "conversations" && (
        <ConversationsMonitor token={token} onStatusUpdated={refreshStats} />
      )}
    </div>
  );
}

function ClaimsQueue({ token, onStatsChange }) {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [decidingId, setDecidingId] = useState(null);
  const [actionError, setActionError] = useState("");

  function load() {
    setLoading(true);
    api
      .adminClaims(statusFilter, token)
      .then(setClaims)
      .finally(() => setLoading(false));
  }

  useEffect(load, [token, statusFilter]);

  async function decide(claimId, decision) {
    setActionError("");
    setDecidingId(claimId);
    try {
      await api.decideClaim(claimId, decision, token);
      load();
      onStatsChange();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setDecidingId(null);
    }
  }

  return (
    <div>
      {actionError && <div className="error-banner">{actionError}</div>}

      <div className="filter-row" style={{ marginBottom: 14 }}>
        {["pending", "verified", "rejected", "all"].map((s) => (
          <button
            key={s}
            className={`btn btn-sm ${statusFilter === s ? "btn-primary" : "btn-outline"}`}
            onClick={() => setStatusFilter(s)}
          >
            {s[0].toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading-text">Loading claims…</div>
      ) : claims.length === 0 ? (
        <div className="empty-state">No {statusFilter !== "all" ? statusFilter : ""} claims right now.</div>
      ) : (
        <div className="items-grid claims-grid">
          {claims.map((c) => (
            <ClaimCard
              key={c.id}
              claim={c}
              busy={decidingId === c.id}
              onVerify={() => decide(c.id, "verified")}
              onReject={() => decide(c.id, "rejected")}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ConversationsMonitor({ token, onStatusUpdated }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [thread, setThread] = useState([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [updating, setUpdating] = useState(false);

  function loadConversations() {
    setLoading(true);
    api
      .adminConversations(token)
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setConversations(list);
        if (selected) {
          const match = list.find(
            (c) =>
              c.item_id === selected.item_id &&
              c.user_a_id === selected.user_a_id &&
              c.user_b_id === selected.user_b_id
          );
          if (match) setSelected(match);
        }
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadConversations();
  }, [token]);

  function openThread(convo) {
    setSelected(convo);
    setThreadLoading(true);
    api
      .adminThread(convo.item_id, convo.user_a_id, convo.user_b_id, token)
      .then(setThread)
      .finally(() => setThreadLoading(false));
  }

  async function handleMarkReturned() {
    if (!selected) return;
    if (!window.confirm(`Mark "${selected.item_title}" as returned?`)) return;

    setUpdating(true);
    try {
      await api.markItemReturned(selected.item_id, token);

      setSelected((prev) => (prev ? { ...prev, item_status: "returned" } : null));
      setConversations((prev) =>
        prev.map((c) =>
          c.item_id === selected.item_id ? { ...c, item_status: "returned" } : c
        )
      );
      onStatusUpdated?.();
      loadConversations();
    } catch (err) {
      alert(err.message || "Failed to mark item as returned.");
    } finally {
      setUpdating(false);
    }
  }

  function formatTime(iso) {
    try {
      return new Date(iso).toLocaleString(undefined, {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  }

  function initials(name) {
    if (!name) return "?";
    return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
  }

  if (loading) return <div className="loading-text">Loading conversations…</div>;
  if (conversations.length === 0) return <div className="empty-state">No conversations yet.</div>;

  return (
    <div className="messages-shell">
      <div className="conv-list">
        {conversations.map((c) => {
          const isActive =
            selected &&
            selected.item_id === c.item_id &&
            selected.user_a_id === c.user_a_id &&
            selected.user_b_id === c.user_b_id;

          return (
            <button
              key={`${c.item_id}-${c.user_a_id}-${c.user_b_id}`}
              className={`conv-row${isActive ? " active" : ""}`}
              onClick={() => openThread(c)}
            >
              <div className="avatar-pair">
                <div className="avatar" style={{ width: 28, height: 28, fontSize: 11 }}>
                  {initials(c.user_a_name)}
                </div>
                <div className="avatar avatar-pair-second" style={{ width: 28, height: 28, fontSize: 11 }}>
                  {initials(c.user_b_name)}
                </div>
              </div>
              <div className="conv-row-text">
                <div className="conv-row-top">
                  <span className="conv-row-name">
                    {c.user_a_name} &amp; {c.user_b_name}
                  </span>
                  <span className="category-chip">{c.message_count} msgs</span>
                </div>
                <div className="conv-row-item">
                  {c.item_title} ({c.item_type})
                </div>
                <div className="conv-row-preview">{c.last_message}</div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="conv-thread">
        {!selected ? (
          <div className="empty-state" style={{ margin: 24 }}>
            Select a conversation to review it.
          </div>
        ) : threadLoading ? (
          <div className="loading-text" style={{ margin: 24 }}>
            Loading…
          </div>
        ) : (
          <div className="thread-inner">
            <div
              className="thread-header"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div className="avatar-pair">
                  <div className="avatar" style={{ width: 32, height: 32, fontSize: 12 }}>
                    {initials(selected.user_a_name)}
                  </div>
                  <div className="avatar avatar-pair-second" style={{ width: 32, height: 32, fontSize: 12 }}>
                    {initials(selected.user_b_name)}
                  </div>
                </div>
                <div>
                  <div className="thread-header-title">
                    {selected.user_a_name} &amp; {selected.user_b_name}
                  </div>
                  <div className="thread-header-sub">
                    About &ldquo;{selected.item_title}&rdquo; · read-only monitoring
                  </div>
                </div>
              </div>

              <div>
                {selected.item_status === "returned" ? (
                  <span
                    style={{
                      background: "#2e7d32",
                      color: "#fff",
                      fontSize: "12px",
                      fontWeight: 600,
                      padding: "4px 10px",
                      borderRadius: "4px",
                    }}
                  >
                    Returned
                  </span>
                ) : (
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={handleMarkReturned}
                    disabled={updating}
                  >
                    {updating ? "Updating..." : "Mark as returned"}
                  </button>
                )}
              </div>
            </div>

            <div className="thread-messages">
              {thread.map((m) => (
                <div key={m.id} className="msg-bubble-row theirs">
                  <div className="avatar" style={{ width: 26, height: 26, fontSize: 10 }}>
                    {initials(m.sender_name)}
                  </div>
                  <div className="msg-bubble">
                    <div className="msg-bubble-sender">{m.sender_name}</div>
                    <div>{m.body}</div>
                    <div className="msg-bubble-time">{formatTime(m.created_at)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AllItems() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ type: "", category: "", status: "", q: "" });

  useEffect(() => {
    api.categories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const handle = setTimeout(() => {
      api
        .listItems(filters)
        .then(setItems)
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(handle);
  }, [filters]);

  return (
    <div>
      <div className="filter-row">
        <input
          type="search"
          placeholder="Search by keyword, location…"
          value={filters.q}
          onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
        />
        <select value={filters.type} onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}>
          <option value="">All types</option>
          <option value="lost">Lost</option>
          <option value="found">Found</option>
        </select>
        <select value={filters.category} onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}>
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="claimed">Claimed</option>
          <option value="returned">Returned</option>
        </select>
      </div>

      {loading ? (
        <div className="loading-text">Loading items…</div>
      ) : items.length === 0 ? (
        <div className="empty-state">No items match your filters.</div>
      ) : (
        <div className="items-grid">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} showReporter />
          ))}
        </div>
      )}
    </div>
  );
}