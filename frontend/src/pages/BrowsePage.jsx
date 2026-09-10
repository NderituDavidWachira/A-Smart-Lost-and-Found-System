import { useEffect, useState } from "react";
import { api } from "../api";
import { useAuth } from "../AuthContext";
import ItemCard from "../components/ItemCard";

export default function BrowsePage() {
  const { token, user } = useAuth();
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ type: "", category: "", q: "" });
  const [claimTarget, setClaimTarget] = useState(null);

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
      <div className="page-header">
        <h1 className="page-title">Browse reported items</h1>
        <p className="page-lede">
          Search everything reported lost or found on Main Campus. Recognise something? Open it and file a claim —
          an administrator verifies ownership before anything changes hands.
        </p>
      </div>

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
      </div>

      {loading ? (
        <div className="loading-text">Loading items…</div>
      ) : items.length === 0 ? (
        <div className="empty-state">No items match your filters yet. Try widening your search.</div>
      ) : (
        <div className="items-grid">
          {items.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              action={
                item.status === "open" && item.reporter_id !== user?.id ? (
                  <button className="btn btn-outline btn-sm" onClick={() => setClaimTarget(item)}>
                    This is mine
                  </button>
                ) : null
              }
            />
          ))}
        </div>
      )}

      {claimTarget && (
        <ClaimModal
          item={claimTarget}
          token={token}
          onClose={() => setClaimTarget(null)}
          onDone={() => {
            setClaimTarget(null);
            api.listItems(filters).then(setItems);
          }}
        />
      )}
    </div>
  );
}

function ClaimModal({ item, token, onClose, onDone }) {
  const [proof, setProof] = useState("");
  const [token_of_appreciation, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.claimItem(item.id, { proof_notes: proof, token_of_appreciation }, token);
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(27,36,48,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        zIndex: 20,
      }}
      onClick={onClose}
    >
      <div className="form-card" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
        <h2 className="page-title" style={{ fontSize: 22 }}>
          Claim &ldquo;{item.title}&rdquo;
        </h2>
        <p className="page-lede" style={{ marginBottom: 20 }}>
          Describe a detail only the true owner would know. An administrator reviews every claim before the item is
          released.
        </p>
        {error && <div className="error-banner">{error}</div>}
        <form onSubmit={submit}>
          <div className="field">
            <label htmlFor="proof">Proof of ownership</label>
            <textarea
              id="proof"
              rows={3}
              required
              value={proof}
              onChange={(e) => setProof(e.target.value)}
              placeholder="e.g. serial number, a scratch on the corner, wallpaper photo…"
            />
          </div>
          <div className="field">
            <label htmlFor="tok">Token of appreciation for the finder (optional)</label>
            <input
              id="tok"
              value={token_of_appreciation}
              onChange={(e) => setToken(e.target.value)}
              placeholder="e.g. a thank-you card, small reward"
            />
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-gold" disabled={busy}>
              {busy ? "Submitting…" : "Submit claim"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}