const BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:5001";

async function request(path, { method = "GET", body, token } = {}) {
  const isFormData = body instanceof FormData;
  const headers = {};
  if (!isFormData && body) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: isFormData ? body : body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    // no body
  }

  if (!res.ok) {
    const message = (data && data.error) || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data;
}

export const api = {
  register: (payload) => request("/api/register", { method: "POST", body: payload }),
  login: (payload) => request("/api/login", { method: "POST", body: payload }),
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

  notifications: (token) => request("/api/notifications", { token }),
  markRead: (id, token) => request(`/api/notifications/${id}/read`, { method: "POST", token }),

  adminClaims: (status, token) => request(`/api/admin/claims?status=${status}`, { token }),
  decideClaim: (claimId, decision, token) =>
    request(`/api/admin/claims/${claimId}/decide`, { method: "POST", body: { decision }, token }),
  adminStats: (token) => request("/api/admin/stats", { token }),
};

function imageUrl(path) {
  if (!path) return null;
  return `${BASE_URL}${path}`;
}

export { BASE_URL, imageUrl };