import { useState } from "react";
import { api } from "../api";
import { useAuth } from "../AuthContext";
import "./AuthPage.css";

export default function AuthPage() {
  const [mode, setMode] = useState("login"); // login | register
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "", is_admin_signup: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { login } = useAuth();

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function switchMode(next) {
    setMode(next);
    setError("");
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
    <div className="auth-page">
      {/* Brand panel */}
      <aside className="auth-hero">
        <div className="auth-hero-inner">
          <div className="auth-crest" aria-hidden="true">
            <svg viewBox="0 0 64 72" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M32 2 L60 12 V34 C60 52 48 64 32 70 C16 64 4 52 4 34 V12 Z"
                stroke="#C9A227"
                strokeWidth="2"
                fill="rgba(201,162,39,0.06)"
              />
              <path d="M20 36 L28 44 L44 26" stroke="#C9A227" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          <p className="auth-wordmark">Paul&apos;s University</p>
          <p className="auth-tagline">The University of Choice</p>

          <div className="auth-hero-rule" />

          <h1 className="auth-hero-headline">Reunite what&apos;s lost.</h1>
          <p className="auth-hero-copy">
            Report a missing item, browse what&apos;s been handed in, and track claims
            across every St. Paul&apos;s campus — all from one place.
          </p>
        </div>
      </aside>

      {/* Form panel */}
      <main className="auth-panel">
        <div className="auth-panel-inner">
          <div className="auth-tabs" role="tablist" aria-label="Choose login or registration">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "login"}
              className={`auth-tab ${mode === "login" ? "is-active" : ""}`}
              onClick={() => switchMode("login")}
            >
              Log in
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "register"}
              className={`auth-tab ${mode === "register" ? "is-active" : ""}`}
              onClick={() => switchMode("register")}
            >
              Create account
            </button>
          </div>

          <h2 className="auth-form-title">
            {mode === "login" ? "Welcome back" : "Join the registry"}
          </h2>
          <p className="auth-form-subtitle">
            {mode === "login"
              ? "Sign in with your university email to continue."
              : "Sign up with your university email to start reporting items."}
          </p>

          {error && (
            <div className="error-banner" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={submit} noValidate>
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
                <input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => update("phone", e.target.value)}
                  placeholder="07XXXXXXXX"
                />
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
                <label htmlFor="admincode">Staff admin code</label>
                <input
                  id="admincode"
                  value={form.is_admin_signup}
                  onChange={(e) => update("is_admin_signup", e.target.value)}
                  placeholder="Leave blank if you're a student"
                />
              </div>
            )}

            <button type="submit" className="auth-submit" disabled={busy}>
              {busy ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}