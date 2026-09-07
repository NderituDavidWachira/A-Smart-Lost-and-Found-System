import { useState } from "react";
import { api } from "../api";
import { useAuth } from "../AuthContext";

export default function AuthPage() {
  const [mode, setMode] = useState("login"); // login | register
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "", is_admin_signup: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { login } = useAuth();

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result =
        mode === "login"
          ? await api.login({ email: form.email, password: form.password })
          : await api.register(form);
      login(result.token, result.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-brand">Campus Lost &amp; Found</div>
        <div className="auth-sub">St. Paul&apos;s University · Main Campus</div>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={submit}>
          {mode === "register" && (
            <div className="field">
              <label htmlFor="name">Full name</label>
              <input id="name" value={form.name} onChange={(e) => update("name", e.target.value)} required />
            </div>
          )}

          <div className="field">
            <label htmlFor="email">University email</label>
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              placeholder="you@spu.ac.ke"
              required
            />
          </div>

          {mode === "register" && (
            <div className="field">
              <label htmlFor="phone">Phone number</label>
              <input id="phone" value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="07XXXXXXXX" />
            </div>
          )}

          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              minLength={6}
              required
            />
          </div>

          {mode === "register" && (
            <div className="field">
              <label htmlFor="admincode">Staff admin code (leave blank if you&apos;re a student)</label>
              <input
                id="admincode"
                value={form.is_admin_signup}
                onChange={(e) => update("is_admin_signup", e.target.value)}
                placeholder="Optional"
              />
            </div>
          )}

          <button type="submit" className="btn btn-gold" style={{ width: "100%" }} disabled={busy}>
            {busy ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
          </button>
        </form>

        <div className="auth-switch">
          {mode === "login" ? (
            <>
              New here?{" "}
              <button type="button" onClick={() => setMode("register")}>
                Create an account
              </button>
            </>
          ) : (
            <>
              Already registered?{" "}
              <button type="button" onClick={() => setMode("login")}>
                Log in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
