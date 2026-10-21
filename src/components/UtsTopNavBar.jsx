import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  BriefcaseBusiness,
  ChartNoAxesCombined,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ClipboardList,
  FileText,
  LayoutDashboard,
  LogOut,
  History,
  Menu,
  Search,
  UserPlus,
  UsersRound,
  X,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import "./UtsTopNavBar.css";
import utsLogo from "../assets/uts-logo.png";
import { useAccess } from "../lib/accessContext";
import QuickNotesShortcut from "./QuickNotesShortcut";

const NAV_ITEMS = [
  { label: "Candidates", path: "/admin/candidate", icon: UsersRound, section: "candidates" },
  { label: "Onboarding", path: "/admin/onboarding/planner", icon: ClipboardList },
  { label: "Projects", path: "/cts-jobs", icon: BriefcaseBusiness },
  { label: "Hours", path: "/hours", icon: Clock3 },
  { label: "Billing", path: "/invoice", icon: FileText },
  { label: "Reports", path: "/breakdown", icon: ChartNoAxesCombined },
  { label: "Overview", path: "/admin/overview", icon: LayoutDashboard, section: "overview" },
  { label: "Activity", path: "/admin/activity", icon: History, supervisorOnly: true },
];

const NAV_COLLAPSED_KEY = "uts-operations-nav-collapsed";

const readStoredCollapsedState = () => {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(NAV_COLLAPSED_KEY) === "true";
};

export default function UtsTopNavBar({ rightSlot = null }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isRegister = location.pathname.startsWith("/register");
  const showWorkspaceHeader = location.pathname === "/admin/overview" || Boolean(rightSlot);
  const { access } = useAccess();
  const canViewActivity = !!access?.permissions?.can_delete_workers;
  const canViewDocs = !!access?.isAdmin;
  const [collapsed, setCollapsed] = useState(readStoredCollapsedState);
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileOpenRef = useRef(false);
  const globalSearchInputRef = useRef(null);
  const [globalSearch, setGlobalSearch] = useState(() => new URLSearchParams(location.search).get("q") || "");

  useEffect(() => {
    const query = new URLSearchParams(location.search).get("q") || "";
    void Promise.resolve().then(() => setGlobalSearch(query));
  }, [location.search]);

  useEffect(() => {
    if (!location.state?.restoreGlobalSearchFocus) return undefined;
    const frame = window.requestAnimationFrame(() => {
      const input = globalSearchInputRef.current;
      if (!input) return;
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [location.state]);

  useLayoutEffect(() => {
    if (isRegister) return undefined;
    document.body.classList.add("uts-operations-shell");
    document.body.classList.toggle("uts-operations-shell-collapsed", collapsed);
    document.body.classList.toggle("uts-operations-shell-no-header", !showWorkspaceHeader);
    return () => {
      document.body.classList.remove("uts-operations-shell", "uts-operations-shell-collapsed", "uts-operations-shell-no-header");
    };
  }, [collapsed, isRegister, showWorkspaceHeader]);

  useEffect(() => {
    mobileOpenRef.current = mobileOpen;
    if (isRegister) return undefined;
    document.body.classList.toggle("uts-mobile-nav-open", mobileOpen);
    return () => document.body.classList.remove("uts-mobile-nav-open");
  }, [isRegister, mobileOpen]);

  useEffect(() => {
    if (isRegister) return undefined;
    let tracking = false;
    let startX = 0;
    let startY = 0;
    let currentX = 0;
    let currentY = 0;

    const handleTouchStart = (event) => {
      if (window.innerWidth > 820 || event.touches.length !== 1) return;
      const touch = event.touches[0];
      const canStart = mobileOpenRef.current || touch.clientX <= 28;
      if (!canStart) return;
      tracking = true;
      startX = touch.clientX;
      startY = touch.clientY;
      currentX = startX;
      currentY = startY;
    };

    const handleTouchMove = (event) => {
      if (!tracking || event.touches.length !== 1) return;
      currentX = event.touches[0].clientX;
      currentY = event.touches[0].clientY;
      const deltaX = currentX - startX;
      const deltaY = currentY - startY;
      if (Math.abs(deltaX) > 12 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
        event.preventDefault();
      }
    };

    const handleTouchEnd = () => {
      if (!tracking) return;
      const deltaX = currentX - startX;
      const deltaY = currentY - startY;
      if (Math.abs(deltaX) >= 56 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
        if (!mobileOpenRef.current && deltaX > 0) setMobileOpen(true);
        if (mobileOpenRef.current && deltaX < 0) setMobileOpen(false);
      }
      tracking = false;
    };

    const cancelTouch = () => { tracking = false; };
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });
    window.addEventListener("touchcancel", cancelTouch, { passive: true });
    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("touchcancel", cancelTouch);
    };
  }, [isRegister]);

  useEffect(() => {
    // Back/forward and links outside the sidebar must also release the scroll lock.
    let active = true;
    queueMicrotask(() => { if (active) setMobileOpen(false); });
    return () => { active = false; };
  }, [location.key]);

  const handleSearch = (event) => {
    event.preventDefault();
    if (location.pathname !== "/admin/overview") return;
    const params = new URLSearchParams(location.search);
    const query = globalSearch.trim();
    if (query) params.set("q", query); else params.delete("q");
    setMobileOpen(false);
    navigate(params.size ? `/admin/overview?${params}` : "/admin/overview");
  };

  const handleGlobalSearchChange = (event) => {
    const value = event.target.value;
    setGlobalSearch(value);
    if (location.pathname !== "/admin/overview") return;
    const params = new URLSearchParams(location.search);
    if (value.trim()) params.set("q", value.trim()); else params.delete("q");
    navigate(params.size ? `/admin/overview?${params}` : "/admin/overview", { replace: true });
  };

  const clearGlobalSearch = () => {
    setGlobalSearch("");
    if (location.pathname !== "/admin/overview") return;
    const params = new URLSearchParams(location.search);
    params.delete("q");
    navigate(params.size ? `/admin/overview?${params}` : "/admin/overview", { replace: true });
  };

  const goTo = (path) => {
    setMobileOpen(false);
    if (path === "/admin/candidate") setGlobalSearch("");
    navigate(path);
  };

  const goToNavItem = (path) => {
    if (path !== location.pathname || location.search) goTo(path);
    else setMobileOpen(false);
  };

  const toggleNavigationManually = () => {
    setCollapsed(value => {
      const nextValue = !value;
      window.localStorage.setItem(NAV_COLLAPSED_KEY, String(nextValue));
      return nextValue;
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  if (isRegister) {
    return (
      <header
        className="uts-public-header"
        style={{
          minHeight: "calc(70px + env(safe-area-inset-top, 0px))",
          padding: "calc(10px + env(safe-area-inset-top, 0px)) 24px 10px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          background: "#182433",
        }}
      >
        <img src={utsLogo} alt="Universal Talent Source" style={{ width: 86, height: 48, objectFit: "contain", flex: "0 0 auto" }} />
        <div className="uts-public-actions">{rightSlot}</div>
      </header>
    );
  }

  return (
    <>
      <aside className={`uts-ops-sidebar ${mobileOpen ? "mobile-open" : ""}`} aria-label="Main navigation">
        <div className="uts-ops-brand" onClick={() => goToNavItem("/admin/candidate")} title="Candidates home">
          <img src={utsLogo} alt="UTS" />
          <div className="uts-ops-brand-copy"><strong>UNIVERSAL TALENT</strong><span>Operations workspace</span></div>
        </div>
        <button className="uts-ops-collapse" type="button" onClick={toggleNavigationManually} aria-label={collapsed ? "Expand navigation" : "Collapse navigation"} title={collapsed ? "Expand navigation" : "Collapse navigation"}>
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
        <nav className="uts-ops-nav">
          <div className="uts-ops-section-label">Workspace</div>
          {NAV_ITEMS.filter((item) => (!item.supervisorOnly || canViewActivity) && (!item.adminOnly || canViewDocs)).map((item) => {
            const Icon = item.icon;
            const active = item.section === "overview"
              ? location.pathname === "/admin/overview"
              : item.section === "candidates"
                ? location.pathname === "/admin/candidate" || (location.pathname.startsWith("/admin/workers/") && !location.pathname.includes("/onboarding"))
                : item.label === "Onboarding"
                  ? location.pathname.includes("/onboarding") || location.pathname === "/admin/planner"
                  : location.pathname.startsWith(item.path);
            return (
              <button key={`${item.label}-${item.path}`} type="button" className={`uts-ops-nav-btn ${active ? "active" : ""}`} onClick={() => goToNavItem(item.path)} aria-label={item.label} title={item.label}>
                <Icon size={19} /><span>{item.label}</span>
              </button>
            );
          })}
        </nav>
        <button className="uts-ops-nav-btn uts-ops-new" type="button" onClick={() => window.open("/register", "_blank", "noopener,noreferrer")} aria-label="New candidate" title="New candidate">
          <UserPlus size={18} /><span>New candidate</span>
        </button>
        <div className="uts-ops-sidebar-foot">
          {canViewDocs ? <QuickNotesShortcut className="uts-ops-nav-btn" showLabel onClick={() => {
            setMobileOpen(false);
            window.dispatchEvent(new Event("uts-open-quick-notes"));
          }} /> : null}
          {canViewDocs ? <button className={`uts-ops-nav-btn${location.pathname === "/admin/docs" ? " active" : ""}`} type="button" onClick={() => goToNavItem("/admin/docs")} aria-label="Docs" title="Docs"><FileText size={18} /><span>Docs</span></button> : null}
          <button className="uts-ops-nav-btn" type="button" onClick={handleLogout} aria-label="Sign out" title="Sign out"><LogOut size={18} /><span>Sign out</span></button>
        </div>
      </aside>

      <button
        className={`uts-ops-mobile-backdrop${mobileOpen ? " visible" : ""}`}
        type="button"
        onClick={() => setMobileOpen(false)}
        aria-label="Close navigation"
        tabIndex={mobileOpen ? 0 : -1}
      />

      {!showWorkspaceHeader ? (
        <button className="uts-ops-icon-btn uts-ops-floating-menu" type="button" onClick={() => setMobileOpen((value) => !value)} aria-label="Open navigation">
          {mobileOpen ? <X size={19} /> : <Menu size={19} />}
        </button>
      ) : null}

      {showWorkspaceHeader ? <header className="uts-ops-topbar">
        <button className="uts-ops-icon-btn uts-ops-mobile-menu" type="button" onClick={() => setMobileOpen((value) => !value)} aria-label="Open navigation">
          {mobileOpen ? <X size={19} /> : <Menu size={19} />}
        </button>
        {location.pathname === "/admin/overview" ? <form className="uts-global-search" onSubmit={handleSearch} role="search">
          <Search size={18} />
          <input ref={globalSearchInputRef} value={globalSearch} onChange={handleGlobalSearchChange} placeholder="Search candidates by name, email or phone..." aria-label="Search candidates" />
          {globalSearch ? <button className="uts-search-clear" type="button" onClick={clearGlobalSearch} aria-label="Clear search" title="Clear search"><X size={15} /></button> : null}
        </form> : null}
        <div className="uts-ops-top-actions">
          {rightSlot}

        </div>
      </header> : null}
    </>
  );
}
