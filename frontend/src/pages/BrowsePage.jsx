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
        .listItems({ ...filters, status: "open,claimed" })
        .then(setItems)
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(handle);
  }, [filters]);

  return (
    <div>
      {/* Sticky Filter Header */}
      <div
        style={{
          position: "sticky",
          top: "-36px",
          marginTop: "-36px",
          marginLeft: "-44px",
          marginRight: "-44px",
          padding: "36px 44px 14px 44px",
          backgroundColor: "var(--paper)",
          zIndex: 10,
        }}
      >
        <div className="page-header" style={{ marginBottom: "14px" }}>
          <h1 className="page-title">Browse reported items</h1>
          <p className="page-lede">
            Search everything reported lost or found on Main Campus. Recognise something? Open it and file a claim —
            an administrator verifies ownership before anything changes hands.
          </p>
        </div>

        <div className="filter-row" style={{ marginBottom: 0 }}>
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
      </div>

      <div style={{ paddingTop: "20px" }}>
        {loading ? (
          <div className="loading-text">Loading items…</div>
        ) : items.length === 0 ? (
          <div className="empty-state">No items match your filters yet. Try widening your search.</div>
        ) : (
          <div className="items-grid">
            {items.map((item) => {
              const isEligible = item.status === "open" && item.reporter_id !== user?.id;

              return (
                <ItemCard
                  key={item.id}
                  item={item}
                  action={
                    isEligible ? (
                      item.item_type === "found" ? (
                        <button
                          type="button"
                          onClick={() => setClaimTarget(item)}
                          style={{
                            padding: "6px 12px",
                            fontSize: "12px",
                            fontWeight: "600",
                            borderRadius: "5px",
                            border: "1px solid #c9933b",
                            backgroundColor: "#fffdf9",
                            color: "#8f6420",
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "#b9862f";
                            e.currentTarget.style.color = "#fff";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "#fffdf9";
                            e.currentTarget.style.color = "#8f6420";
                          }}
                        >
                          This is mine
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setClaimTarget(item)}
                          style={{
                            padding: "6px 12px",
                            fontSize: "12px",
                            fontWeight: "600",
                            borderRadius: "5px",
                            border: "1px solid #3e6f52",
                            backgroundColor: "#f4f9f5",
                            color: "#275038",
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "#3e6f52";
                            e.currentTarget.style.color = "#fff";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "#f4f9f5";
                            e.currentTarget.style.color = "#275038";
                          }}
                        >
                          I found this
                        </button>
                      )
                    ) : null
                  }
                />
              );
            })}
          </div>
        )}
      </div>

      {claimTarget && (
        <ClaimModal
          item={claimTarget}
          token={token}
          onClose={() => setClaimTarget(null)}
          onDone={() => {
            setClaimTarget(null);
            api.listItems({ ...filters, status: "open,claimed" }).then(setItems);
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

  const isFoundReport = item.item_type === "lost"; // A user is reporting that they found an item listed as lost

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
        background: "rgba(58,20,32,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        zIndex: 100,
      }}
      onClick={onClose}
    >
      <div className="form-card" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
        <h2 className="page-title" style={{ fontSize: 22 }}>
          {isFoundReport ? `Report Found: "${item.title}"` : `Claim "${item.title}"`}
        </h2>
        <p className="page-lede" style={{ marginBottom: 20 }}>
          {isFoundReport
            ? "Provide details on where you found this item and how the owner or campus administration can retrieve it."
            : "Describe unique details only the true owner would know. An administrator reviews every claim before the item is released."}
        </p>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={submit}>
          <div className="field">
            <label htmlFor="proof">
              {isFoundReport ? "Where/when did you find it?" : "Proof of ownership"}
            </label>
            <textarea
              id="proof"
              rows={3}
              required
              value={proof}
              onChange={(e) => setProof(e.target.value)}
              placeholder={
                isFoundReport
                  ? "e.g. Found on the second floor library table at 11 AM; left with reception..."
                  : "e.g. Serial number, specific scratches, screen wallpaper description..."
              }
            />
          </div>

          {!isFoundReport && (
            <div className="field">
              <label htmlFor="tok">Token of appreciation for the finder (optional)</label>
              <input
                id="tok"
                value={token_of_appreciation}
                onChange={(e) => setToken(e.target.value)}
                placeholder="e.g. a thank-you note, small reward"
              />
            </div>
          )}

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className={isFoundReport ? "btn btn-primary" : "btn btn-gold"}
              disabled={busy}
            >
              {busy ? "Submitting…" : isFoundReport ? "Submit report" : "Submit claim"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}