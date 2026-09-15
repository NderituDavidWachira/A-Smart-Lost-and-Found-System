import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../AuthContext";



export default function Layout({ children, unreadCount = 0, unreadMessages = 0 }) {
  const { user, logout } = useAuth();
  const [navOpen, setNavOpen] = useState(false);
  const location = useLocation();

  // Close the drawer whenever the route changes, so tapping a nav link on
  // mobile doesn't leave the menu covering the page you just opened.
  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

  // Any unread count, used for the dot on the hamburger button when the
  // drawer is closed and the badges aren't visible.
  const totalUnread = unreadCount + unreadMessages;

  return (
    <div className="app-shell">
      <header className="mobile-bar">
        <button
          className="hamburger"
          aria-label="Open navigation menu"
          aria-expanded={navOpen}
          onClick={() => setNavOpen(true)}
        >
          <span />
          <span />
          <span />
          {totalUnread > 0 && <span className="hamburger-dot" />}
        </button>
        <div className="mobile-bar-title">Campus Lost &amp; Found</div>
      </header>

      {navOpen && <div className="nav-backdrop" onClick={() => setNavOpen(false)} />}

      <aside className={`sidebar${navOpen ? " open" : ""}`}>
        <div className="sidebar-head">
          <div>
            <div className="brand">Campus Lost &amp; Found</div>
            <div className="brand-sub">St. Paul&apos;s University · Main Campus</div>
          </div>
          <button className="nav-close" aria-label="Close navigation menu" onClick={() => setNavOpen(false)}>
            ×
          </button>
        </div>

        <nav className="nav-group">
          <NavLink to="/" end className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
             Browse items
          </NavLink>
          <NavLink to="/report" className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
             Report an item
          </NavLink>
          <NavLink to="/messages" className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
             Messages
            {unreadMessages > 0 && <span className="nav-badge">{unreadMessages}</span>}
          </NavLink>
          <NavLink to="/notifications" className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
             Notifications
            {unreadCount > 0 && <span className="nav-badge">{unreadCount}</span>}
          </NavLink>
          {user?.role === "admin" && (
            <NavLink to="/admin" className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
               Admin dashboard
            </NavLink>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">{user?.name}</div>
          <div>{user?.role === "admin" ? "Administrator" : "Student"}</div>
          <button className="logout-btn" onClick={logout}>
            Log out
          </button>
        </div>
      </aside>

      <main className="main">{children}</main>
    </div>
  );
}