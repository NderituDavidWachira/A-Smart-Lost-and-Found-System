// Local development (npm run dev) falls back to your local backend.
// On Netlify, set VITE_API_URL to your live backend, e.g. https://api.ryantech.co.ke
const rawBaseUrl =
  import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://127.0.0.1:5001" : "");

// Remove trailing slashes so "https://api.site.com/" doesn't create "//api/..."
const BASE_URL = rawBaseUrl.replace(/\/+$/, "");

if (!BASE_URL) {
  console.error("VITE_API_URL is not set. Add it in Netlify > Environment variables and redeploy.");
}

async function request(path, { method = "GET", body, token } = {}) {
  const isFormData = body instanceof FormData;
  const headers = {};
  if (!isFormData && body) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: isFormData ? body : body ? JSON.stringify(body) : undefined,
    });
  } catch {
    // Network error, wrong URL, server down, CORS block, or mixed content (http vs https)
    throw new Error("Cannot reach the server. Please check your connection and try again.");
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    // no body
  }

  if (!res.ok) {
    const message = (data && (data.error || data.message || data.detail)) || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data;
}

export const api = {
  register: (payload) => request("/api/register", { method: "POST", body: payload }),
  login: (payload) => request("/api/login", { method: "POST", body: payload }),
  forgotPassword: (payload) => request("/api/forgot-password", { method: "POST", body: payload }),
  me: (token) => request("/api/me", { token }),

  categories: () => request("/api/categories"),
  listItems: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
    return request(`/api/items${qs ? `?${qs}` : ""}`);
  },
  getItem: (id) => request(`/api/items/${id}`),
  createItem: (payload, token) => {
    const formData = new FormData();
    Object.entries(payload).forEach(([key, value]) => {
      if (key === "image") {
        if (value) formData.append("image", value);
      } else if (value !== undefined && value !== null) {
        formData.append(key, value);
      }
    });
    return request("/api/items", { method: "POST", body: formData, token });
  },

  claimItem: (itemId, payload, token) =>
    request(`/api/items/${itemId}/claim`, { method: "POST", body: payload, token }),

  sendMessage: (itemId, payload, token) =>
    request(`/api/items/${itemId}/messages`, { method: "POST", body: payload, token }),
  getThread: (itemId, withUserId, token) =>
    request(`/api/items/${itemId}/messages${withUserId ? `?with=${withUserId}` : ""}`, { token }),
  myConversations: (token) => request("/api/conversations", { token }),

  notifications: (token) => request("/api/notifications", { token }),
  markRead: (id, token) => request(`/api/notifications/${id}/read`, { method: "POST", token }),

  adminClaims: (status, token) => request(`/api/admin/claims?status=${status}`, { token }),
  decideClaim: (claimId, decision, token) =>
    request(`/api/admin/claims/${claimId}/decide`, { method: "POST", body: { decision }, token }),
  adminStats: (token) => request("/api/admin/stats", { token }),
  adminConversations: (token) => request("/api/admin/conversations", { token }),
  adminThread: (itemId, userA, userB, token) =>
    request(`/api/admin/items/${itemId}/messages?a=${userA}&b=${userB}`, { token }),

  // Admin action to mark an item as returned
  markItemReturned: (itemId, token) =>
    request(`/api/admin/items/${itemId}/return`, { method: "POST", token }),
};

// Image paths are stored as "/uploads/<file>", so prefix them with the backend URL.
function imageUrl(path) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${BASE_URL}${path}`;
}

export { BASE_URL, imageUrl };