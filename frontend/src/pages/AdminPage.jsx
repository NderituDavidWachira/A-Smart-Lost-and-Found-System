import { useEffect, useState } from "react";
import { api } from "../api";
import { useAuth } from "../AuthContext";
import ItemCard from "../components/ItemCard";
import ClaimCard from "../components/ClaimCard";

export default function AdminPage() {
  const { token } = useAuth();
  const [view, setView] = useState("claims"); // claims | items
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.adminStats(token).then(setStats);
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
      </div>

      {view === "claims" ? <ClaimsQueue token={token} onStatsChange={() => api.adminStats(token).then(setStats)} /> : <AllItems />}
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