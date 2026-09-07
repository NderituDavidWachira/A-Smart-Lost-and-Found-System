import { useEffect, useState } from "react";
import { api } from "../api";
import { useAuth } from "../AuthContext";

export default function AdminPage() {
  const { token } = useAuth();
  const [stats, setStats] = useState(null);
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("pending");

  function load() {
    setLoading(true);
    Promise.all([api.adminStats(token), api.adminClaims(statusFilter, token)])
      .then(([s, c]) => {
        setStats(s);
        setClaims(c);
      })
      .finally(() => setLoading(false));
  }

  useEffect(load, [token, statusFilter]);

  async function decide(claimId, decision) {
    await api.decideClaim(claimId, decision, token);
    load();
  }

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
        claims.map((c) => (
          <div className="claim-card" key={c.id}>
            <div className="claim-card-head">
              <strong>Claim #{c.id} — item #{c.item_id}</strong>
              <span className={`tag status-${c.status === "verified" ? "returned" : c.status === "rejected" ? "open" : "claimed"}`}>
                {c.status}
              </span>
            </div>
            <div className="item-meta">Claimed by {c.claimant_name}</div>
            <div className="claim-note-label">Proof of ownership</div>
            <div>{c.proof_notes || "—"}</div>
            {c.token_of_appreciation && (
              <>
                <div className="claim-note-label">Token of appreciation for finder</div>
                <div>{c.token_of_appreciation}</div>
              </>
            )}
            {c.status === "pending" && (
              <div className="claim-actions">
                <button className="btn btn-gold btn-sm" onClick={() => decide(c.id, "verified")}>
                  Verify &amp; mark returned
                </button>
                <button className="btn btn-outline btn-sm" onClick={() => decide(c.id, "rejected")}>
                  Reject claim
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
