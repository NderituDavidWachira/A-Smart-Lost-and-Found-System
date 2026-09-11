import { useState } from "react";
import { api } from "../api";
import { useAuth } from "../AuthContext";
import "./AuthPage.css";
import campusPhoto from "../assets/good.jpg";
import logol from "../assets/St.logo.png";

export default function AuthPage() {
  const [mode, setMode] = useState("login"); // login | register
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "" });
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const { login } = useAuth();

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function switchMode(next) {
    setMode(next);
    setError("");
    setNotice("");
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    setNotice("");
    setBusy(true);
    try {
      if (mode === "login") {
        const result = await api.login({ email: form.email, password: form.password });
        login(result.token, result.user);
        return;
      }

      // Registration succeeds but does NOT log the user in — send them back
      // to the login tab instead, with their email prefilled.
      await api.register(form);
      setMode("login");
      setNotice("Account created. Please log in below.");
      setForm((f) => ({ name: "", email: f.email, password: "", phone: "" }));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-shell" style={{ backgroundImage: `url(${campusPhoto})` }}>
      <div className="auth-overlay" />

      <div className="auth-card">
        <div className="auth-crestbar">
          <div className="auth-cret-badge" aria-hidden="true">
            <img style={{ width: "80px", height: "70px" }} src={logol} alt="logo" />
          </div>
          <div className="auth-crest-text">
            <p className="auth-crest-name">St. Paul&apos;s University</p>
            <p className="auth-crest-motto">Servants of God and Humanity</p>
          </div>
        </div>

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

        <p className="auth-welcome">
          {mode === "login" ? "Welcome to the Lost & Found Portal" : "Register for the Lost & Found Portal"}
        </p>

        {notice && (
          <div className="success-banner" role="status">
            {notice}
          </div>
        )}
        {error && (
          <div className="error-banner" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={submit} noValidate>
          {mode === "register" && (
            <div className="pill-field">
              <span className="pill-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-4.4 0-8 2-8 5v1h16v-1c0-3-3.6-5-8-5Z" fill="currentColor"/></svg>
              </span>
              <input
                id="name"
                placeholder="Full name"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                required
              />
            </div>
          )}

          <div className="pill-field">
            <span className="pill-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-4.4 0-8 2-8 5v1h16v-1c0-3-3.6-5-8-5Z" fill="currentColor"/></svg>
            </span>
            <input
              id="email"
              type="email"
              placeholder="University email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              required
            />
          </div>

          {mode === "register" && (
            <div className="pill-field">
              <span className="pill-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none"><path d="M6.6 10.8c1.4 2.8 3.8 5.2 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.7 3.6.8.6 0 1 .5 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.2c.5 0 1 .4 1 1 .1 1.3.4 2.5.8 3.6.1.4 0 .8-.2 1L6.6 10.8Z" fill="currentColor"/></svg>
              </span>
              <input
                id="phone"
                placeholder="Phone number"
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
              />
            </div>
          )}

          <div className="pill-field">
            <span className="pill-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none"><path d="M7 10V8a5 5 0 0 1 10 0v2h1a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1h1Zm2 0h6V8a3 3 0 0 0-6 0v2Z" fill="currentColor"/></svg>
            </span>
            <input
              id="password"
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              minLength={6}
              required
            />
          </div>

          {mode === "login" && (
            <div className="auth-row">
              <label className="auth-remember">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                Remember me
              </label>
              <button type="button" className="auth-forgot" onClick={() => setShowForgot(true)}>
                Forgot password?
              </button>
            </div>
          )}

          <button type="submit" className="auth-submit" disabled={busy}>
            {busy ? "Please wait…" : mode === "login" ? "Log In" : "Create account"}
          </button>
        </form>
      </div>

      <div className="auth-footer">2026 © Campus Lost &amp; Found</div>

      {showForgot && (
        <ForgotPasswordModal
          initialEmail={form.email}
          onClose={() => setShowForgot(false)}
          onDone={(email) => {
            setShowForgot(false);
            setMode("login");
            setNotice("Password updated. Please log in with your new password.");
            setForm((f) => ({ ...f, email, password: "" }));
          }}
        />
      )}
    </div>
  );
}

function ForgotPasswordModal({ initialEmail, onClose, onDone }) {
  const [email, setEmail] = useState(initialEmail || "");
  const [phone, setPhone] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setBusy(true);
    try {
      await api.forgotPassword({ email, phone, new_password: newPassword });
      onDone(email);
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
        background: "rgba(58,20,32,0.65)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        zIndex: 30,
      }}
      onClick={onClose}
    >
      <div className="form-card" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
        <h2 className="page-title" style={{ fontSize: 20 }}>
          Reset your password
        </h2>
        <p className="page-lede" style={{ marginBottom: 18 }}>
          Confirm the email and phone number on your account, then set a new password. There's no email
          reset link — this updates it immediately.
        </p>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={submit}>
          <div className="field">
            <label htmlFor="reset-email">University email</label>
            <input
              id="reset-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="reset-phone">Phone number on file</label>
            <input
              id="reset-phone"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="07XXXXXXXX"
            />
          </div>
          <div className="field">
            <label htmlFor="reset-new">New password</label>
            <input
              id="reset-new"
              type="password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="reset-confirm">Confirm new password</label>
            <input
              id="reset-confirm"
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-gold" disabled={busy}>
              {busy ? "Updating…" : "Update password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}