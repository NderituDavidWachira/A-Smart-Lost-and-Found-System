import { imageUrl } from "../api";

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
  } catch {
    return iso;
  }
}

export default function ItemCard({ item, action, showReporter = false }) {
  const photo = imageUrl(item.image_url);

  return (
    <div className="item-card">
      <div className="item-photo-wrap">
        {photo ? (
          <img src={photo} alt={item.title} className="item-photo" loading="lazy" />
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
        <span className={`item-type-badge ${item.item_type}`}>{item.item_type}</span>
        <span className={`item-status-badge status-${item.status}`}>{item.status}</span>
      </div>

      <div className="item-body">
        <h3 className="item-title">{item.title}</h3>
        <div className="item-meta-line">
          <span className="item-meta-loc">{item.location}</span>
          <span className="item-meta-dot">·</span>
          <span>{formatDate(item.date_occurred)}</span>
        </div>
        {showReporter && <div className="item-meta-line">Reported by {item.reporter_name}</div>}
        {item.description && <p className="item-desc">{item.description}</p>}

        <div className="item-card-footer">
          <span className="category-chip">{item.category}</span>
          {action}
        </div>
      </div>
    </div>
  );
}