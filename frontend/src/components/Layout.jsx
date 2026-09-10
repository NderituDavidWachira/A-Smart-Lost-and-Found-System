import { NavLink } from "react-router-dom";
import { useAuth } from "../AuthContext";

const icons = {
  browse: "🔎",
  report: "＋",
  notifications: "🔔",
  admin: "🛡",
};

export default function Layout({ children, unreadCount = 0 }) {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === "admin";

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <div className="brand">Campus Lost &amp; Found</div>
          <div className="brand-sub">St. Paul&apos;s University · Main Campus</div>
        </div>

        <nav className="nav-group">
          {isAdmin ? (
            <NavLink to="/admin" className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
              <span>{icons.admin}</span> Admin dashboard
            </NavLink>
          ) : (
            <>
              <NavLink to="/" end className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
                <span>{icons.browse}</span> Browse items
              </NavLink>
              <NavLink to="/report" className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
                <span>{icons.report}</span> Report an item
              </NavLink>
              <NavLink to="/notifications" className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
                <span>{icons.notifications}</span> Notifications
                {unreadCount > 0 && <span className="nav-badge">{unreadCount}</span>}
              </NavLink>
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">{user?.name}</div>
          <div>{isAdmin ? "Administrator" : "Student"}</div>
          <button className="logout-btn" onClick={logout}>
            Log out
          </button>
        </div>
      </aside>

      <main className="main">{children}</main>
    </div>
  );
}