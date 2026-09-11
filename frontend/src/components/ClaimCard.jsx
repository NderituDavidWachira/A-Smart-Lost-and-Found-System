import { imageUrl } from "../api";

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
  } catch {
    return iso;
  }
}

export default function ClaimCard({ claim, busy, onVerify, onReject }) {
  const photo = imageUrl(claim.item_image_url);
  const statusForBadge =
    claim.status === "verified" ? "returned" : claim.status === "rejected" ? "open" : "claimed";

  return (
    <div className="item-card claim-card-v2">
      <div className="item-photo-wrap">
        {photo ? (
          <img src={photo} alt={claim.item_title} className="item-photo" loading="lazy" />
        ) : (
          <div className="item-photo-placeholder" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="32" height="32" fill="none">
              <path
                d="M4 6a2 2 0 0 1 2-2h2l1.5-2h5L16 4h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6Z"
                stroke="currentColor"
                strokeWidth="1.4"
              />
              <circle cx="12" cy="13" r="3.2" stroke="currentColor" strokeWidth="1.4" />
            </svg>
          </div>
        )}
        {claim.item_type && <span className={`item-type-badge ${claim.item_type}`}>{claim.item_type}</span>}
        <span className={`item-status-badge status-${statusForBadge}`}>{claim.status}</span>
      </div>

      <div className="item-body">
        <h3 className="item-title">{claim.item_title || `Item #${claim.item_id}`}</h3>
        <div className="item-meta-line">
          <span className="item-meta-loc">{claim.item_location}</span>
          {claim.item_date_occurred && (
            <>
              <span className="item-meta-dot">·</span>
              <span>{formatDate(claim.item_date_occurred)}</span>
            </>
          )}
        </div>
        <div className="item-meta-line">Claimed by {claim.claimant_name}</div>

        <div className="claim-note-label">Proof of ownership</div>
        <p className="item-desc claim-note-text">{claim.proof_notes || "—"}</p>

        {claim.token_of_appreciation && (
          <>
            <div className="claim-note-label">Token of appreciation</div>
            <p className="item-desc claim-note-text">{claim.token_of_appreciation}</p>
          </>
        )}

        <div className="item-card-footer">
          {claim.item_category && <span className="category-chip">{claim.item_category}</span>}
          {claim.status === "pending" && (
            <div className="claim-actions" style={{ marginTop: 0 }}>
              <button className="btn btn-gold btn-sm" disabled={busy} onClick={onVerify}>
                {busy ? "Verifying…" : "Verify"}
              </button>
              <button className="btn btn-outline btn-sm" disabled={busy} onClick={onReject}>
                {busy ? "Rejecting…" : "Reject"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}