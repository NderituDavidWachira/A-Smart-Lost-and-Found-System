import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../AuthContext";
import ItemCard from "../components/ItemCard";

export default function BrowsePage() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ type: "", category: "", q: "" });
  const [claimTarget, setClaimTarget] = useState(null);
  const [foundTarget, setFoundTarget] = useState(null);

  useEffect(() => {
    api.categories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const handle = setTimeout(() => {
      // Returned items are archived — they're done, so students shouldn't
      // see them cluttering the browse grid. This isn't a user-facing
      // toggle; the admin dashboard's "All items" view is where returned
      // items remain visible.
      api
        .listItems({ ...filters, status: "open,claimed" })
        .then(setItems)
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(handle);
  }, [filters]);

  function refreshItems() {
    api.listItems({ ...filters, status: "open,claimed" }).then(setItems);
  }

  function renderAction(item) {
    if (item.status !== "open" || item.reporter_id === user?.id) return null;

    if (item.item_type === "found") {
      return (
        <button className="btn btn-outline btn-sm" onClick={() => setClaimTarget(item)}>
          This is mine
        </button>
      );
    }

    // item.item_type === "lost" — someone else browsing can say they found it,
    // which opens a private, admin-monitored chat with the person who lost it,
    // instead of forcing them to file a whole separate "found" report first.
    return (
      <button className="btn btn-outline btn-sm" onClick={() => setFoundTarget(item)}>
        I found this
      </button>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Browse reported items</h1>
        <p className="page-lede">
          Search everything reported lost or found on Main Campus. Recognise something? Open it — claim a found
          item, or tell the owner directly if you found something they lost.
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
            <ItemCard key={item.id} item={item} action={renderAction(item)} />
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
            refreshItems();
          }}
        />
      )}

      {foundTarget && (
        <FoundResponseModal
          item={foundTarget}
          token={token}
          onClose={() => setFoundTarget(null)}
          onDone={() => {
            const reporterId = foundTarget.reporter_id;
            const itemId = foundTarget.id;
            setFoundTarget(null);
            navigate(`/messages?item=${itemId}&with=${reporterId}`);
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
    <div className="modal-overlay" onClick={onClose}>
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

function FoundResponseModal({ item, token, onClose, onDone }) {
  const { user } = useAuth();
  const [body, setBody] = useState(
    () => `Hi, I'm ${user?.name || "a fellow student"}. I think I found your ${item.title}. Let me know where we can meet up!`
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    setError("");
    try {
      // No to_user_id needed — the backend defaults to the item's reporter
      // for a stranger's first message on a lost item.
      await api.sendMessage(item.id, { body: body.trim() }, token);
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="form-card" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
        <h2 className="page-title" style={{ fontSize: 22 }}>
          Report Found: &ldquo;{item.title}&rdquo;
        </h2>
        <p className="page-lede" style={{ marginBottom: 20 }}>
          We've drafted a starting message for you — add where and when you found it, then send.
        </p>
        {error && <div className="error-banner">{error}</div>}
        <form onSubmit={submit}>
          <div className="field">
            <label htmlFor="found-body">Your message</label>
            <textarea
              id="found-body"
              rows={4}
              required
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>
          <p style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: -6, marginBottom: 16 }}>
            This starts a private conversation with the person who reported it lost. An administrator can review
            the conversation if needed.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? "Sending…" : "Submit report"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}