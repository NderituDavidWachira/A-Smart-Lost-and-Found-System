import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { api } from "./api";

const AuthContext = createContext(null);

const TOKEN_KEY = "lf_token";
const USER_KEY = "lf_user";

// How long the page can be hidden (switched app, screen off) before logging out.
// Kept at 3s so that a normal page refresh does not log people out.
const HIDDEN_LOGOUT_MS = 3000;

// Pause auto-logout for this long after a file input is clicked (camera/gallery).
const FILE_PICKER_GRACE_MS = 2 * 60 * 1000;

function readStoredUser() {
  try {
    return JSON.parse(sessionStorage.getItem(USER_KEY));
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(readStoredUser);
  const [loading, setLoading] = useState(() => !!sessionStorage.getItem(TOKEN_KEY));

  const hiddenAt = useRef(null);
  const hideTimer = useRef(null);
  const suppressUntil = useRef(0);

  const logout = useCallback(() => {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const login = useCallback((newToken, newUser) => {
    sessionStorage.setItem(TOKEN_KEY, newToken);
    sessionStorage.setItem(USER_KEY, JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }, []);

  // One-time cleanup of old sessions that were saved in localStorage.
  useEffect(() => {
    try {
      localStorage.clear();
    } catch {
      /* ignore */
    }
  }, []);

  // On start, trust the server (not saved data) for who the user is and their role.
  useEffect(() => {
    const saved = sessionStorage.getItem(TOKEN_KEY);
    if (!saved) {
      setLoading(false);
      return;
    }
    api
      .me(saved)
      .then((fresh) => {
        sessionStorage.setItem(USER_KEY, JSON.stringify(fresh));
        setUser(fresh);
      })
      .catch(() => logout())
      .finally(() => setLoading(false));
  }, [logout]);

  // Log out when the page is left (mobile app switch, screen lock, etc.).
  useEffect(() => {
    if (!token) return;

    const onFilePickerClick = (e) => {
      if (e.target && e.target.tagName === "INPUT" && e.target.type === "file") {
        suppressUntil.current = Date.now() + FILE_PICKER_GRACE_MS;
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        hiddenAt.current = Date.now();
        clearTimeout(hideTimer.current);
        hideTimer.current = setTimeout(() => {
          if (Date.now() < suppressUntil.current) return;
          logout();
        }, HIDDEN_LOGOUT_MS);
      } else {
        // Back on the page. Timers can be frozen while hidden on phones,
        // so check how long we were away.
        clearTimeout(hideTimer.current);
        const away = hiddenAt.current ? Date.now() - hiddenAt.current : 0;
        hiddenAt.current = null;
        if (away >= HIDDEN_LOGOUT_MS && Date.now() >= suppressUntil.current) {
          logout();
        }
      }
    };

    document.addEventListener("click", onFilePickerClick, true);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("click", onFilePickerClick, true);
      document.removeEventListener("visibilitychange", onVisibility);
      clearTimeout(hideTimer.current);
    };
  }, [token, logout]);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}