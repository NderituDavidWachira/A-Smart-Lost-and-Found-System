import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../AuthContext";

const today = () => new Date().toISOString().slice(0, 10);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export default function ReportPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    item_type: "lost",
    category: "",
    title: "",
    description: "",
    location: "",
    date_occurred: today(),
  });
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    api.categories().then((cats) => {
      setCategories(cats);
      setForm((f) => ({ ...f, category: cats[0] || "" }));
    });
  }, []);

  useEffect(() => {
    if (!image) {
      setImagePreview(null);
      return;
    }
    const url = URL.createObjectURL(image);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleImageChange(e) {
    const file = e.target.files?.[0];
    if (!file) {
      setImage(null);
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      e.target.value = "";
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError("Image is too large — please choose one under 5MB.");
      e.target.value = "";
      return;
    }
    setError("");
    setImage(file);
  }

  function clearImage() {
    setImage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setSuccess(null);
    try {
      const result = await api.createItem({ ...form, image }, token);
      setSuccess(result);
      setForm((f) => ({ ...f, title: "", description: "", location: "" }));
      clearImage();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Report an item</h1>
        <p className="page-lede">
          The more specific your description — and a photo, if you have one — the faster the matching engine can
          connect a lost report with a found one.
        </p>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {success && (
        <div className="success-banner">
          Reported successfully.{" "}
          {success.match_count > 0
            ? `We found ${success.match_count} possible match${success.match_count > 1 ? "es" : ""} — check Notifications.`
            : "We'll notify you the moment a possible match is reported."}{" "}
          <button className="btn btn-sm btn-outline" style={{ marginLeft: 8 }} onClick={() => navigate("/")}>
            Browse items
          </button>
        </div>
      )}

      <div className="form-card">
        <form onSubmit={submit}>
          <div className="toggle-row">
            <button
              type="button"
              className={`toggle-btn lost ${form.item_type === "lost" ? "active lost" : ""}`}
              onClick={() => update("item_type", "lost")}
            >
              I lost something
            </button>
            <button
              type="button"
              className={`toggle-btn found ${form.item_type === "found" ? "active found" : ""}`}
              onClick={() => update("item_type", "found")}
            >
              I found something
            </button>
          </div>

          <div className="field">
            <label htmlFor="title">Item title</label>
            <input
              id="title"
              required
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              placeholder="e.g. Blue Samsung phone"
            />
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="category">Category</label>
              <select id="category" value={form.category} onChange={(e) => update("category", e.target.value)}>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="date">Date {form.item_type === "lost" ? "lost" : "found"}</label>
              <input
                id="date"
                type="date"
                required
                value={form.date_occurred}
                onChange={(e) => update("date_occurred", e.target.value)}
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="location">Location</label>
            <input
              id="location"
              required
              value={form.location}
              onChange={(e) => update("location", e.target.value)}
              placeholder="e.g. Library, second floor"
            />
          </div>

          <div className="field">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              rows={4}
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              placeholder="Colour, brand, distinguishing marks…"
            />
          </div>

          <div className="field">
            <label htmlFor="image">Photo (optional)</label>
            {imagePreview ? (
              <div className="image-preview-wrap">
                <img src={imagePreview} alt="Selected item preview" className="image-preview" />
                <button type="button" className="btn btn-outline btn-sm" onClick={clearImage}>
                  Remove photo
                </button>
              </div>
            ) : (
              <input id="image" type="file" accept="image/*" ref={fileInputRef} onChange={handleImageChange} />
            )}
          </div>

          <button type="submit" className="btn btn-gold" disabled={busy}>
            {busy ? "Submitting…" : `Report ${form.item_type} item`}
          </button>
        </form>
      </div>
    </div>
  );
}