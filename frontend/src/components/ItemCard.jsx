function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

export default function ItemCard({ item, action }) {
  return (
    <div className={`item-card type-${item.item_type}`}>
      <div className="item-main">
        <div className="item-top-row">
          <h3 className="item-title">{item.title}</h3>
          <span className={`tag ${item.item_type}`}>{item.item_type}</span>
          <span className={`tag status-${item.status}`}>{item.status}</span>
        </div>
        <div className="item-meta">
          {item.location} · {formatDate(item.date_occurred)} · reported by {item.reporter_name}
        </div>
        {item.description && <p className="item-desc">{item.description}</p>}
      </div>
      <div className="item-side">
        <span className="category-chip">{item.category}</span>
        {action}
      </div>
    </div>
  );
}
