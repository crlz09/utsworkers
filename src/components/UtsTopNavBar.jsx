import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Bell,
  BriefcaseBusiness,
  ChartNoAxesCombined,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileText,
  LayoutDashboard,
  LogOut,
  Home,
  History,
  Menu,
  Search,
  UserPlus,
  UsersRound,
  X,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { loadAdminNotificationCount } from "../lib/adminNotifications";
import utsLogo from "../assets/uts-logo.png";

const NAV_ITEMS = [
  { label: "Overview", path: "/admin", icon: LayoutDashboard, section: "overview" },
  { label: "Candidates", path: "/admin/candidates", icon: UsersRound, section: "candidates" },
  { label: "Projects", path: "/cts-jobs", icon: BriefcaseBusiness },
  { label: "Hours", path: "/hours", icon: Clock3 },
  { label: "Billing", path: "/invoice", icon: FileText },
  { label: "Reports", path: "/breakdown", icon: ChartNoAxesCombined },
  { label: "Activity", path: "/admin/activity", icon: History, supervisorOnly: true },
];

const NAV_COLLAPSED_KEY = "uts-operations-nav-collapsed";
const NAV_AUTO_COLLAPSE_KEY = "uts-operations-nav-auto-collapse-at";
const NAV_AUTO_COLLAPSE_DELAY = 3000;

const readStoredCollapsedState = () => {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(NAV_COLLAPSED_KEY) === "true";
};

export default function UtsTopNavBar({ rightSlot = null }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isRegister = location.pathname.startsWith("/register");
  const isAdminArea = location.pathname.startsWith("/admin");
  const isCandidateWorkspace = location.pathname === "/admin/candidates"
    || location.pathname.startsWith("/admin/workers/");
  const showWorkspaceHeader = location.pathname === "/admin"
    || location.pathname === "/admin/candidates"
    || location.pathname.startsWith("/admin/workers/");
  const [notificationCount, setNotificationCount] = useState(0);
  const [canViewActivity, setCanViewActivity] = useState(false);
  const [collapsed, setCollapsed] = useState(readStoredCollapsedState);
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileOpenRef = useRef(false);
  const autoCollapseTimerRef = useRef(null);
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

  useEffect(() => {
    if (isRegister || typeof window === "undefined") return undefined;
    const collapseAt = Number(window.sessionStorage.getItem(NAV_AUTO_COLLAPSE_KEY));
    if (!collapseAt || window.innerWidth <= 820) return undefined;

    const collapseNavigation = () => {
      setCollapsed(true);
      window.localStorage.setItem(NAV_COLLAPSED_KEY, "true");
      window.sessionStorage.removeItem(NAV_AUTO_COLLAPSE_KEY);
      autoCollapseTimerRef.current = null;
    };
    const remaining = Math.max(0, collapseAt - Date.now());
    autoCollapseTimerRef.current = window.setTimeout(collapseNavigation, remaining);
    return () => {
      if (autoCollapseTimerRef.current) window.clearTimeout(autoCollapseTimerRef.current);
      autoCollapseTimerRef.current = null;
    };
  }, [isRegister]);

  useEffect(() => {
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

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });
    window.addEventListener("touchcancel", handleTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [isRegister]);

  useEffect(() => {
    if (isRegister) return undefined;
    let active = true;
    const loadCount = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!data.session) return;
        const [count, permissionResult] = await Promise.all([
          loadAdminNotificationCount(supabase),
          supabase.from("admin_permissions").select("can_delete_workers").eq("user_id", data.session.user.id).maybeSingle(),
        ]);
        if (active) {
          setNotificationCount(count);
          setCanViewActivity(!!permissionResult.data?.can_delete_workers);
        }
      } catch {
        if (active) setNotificationCount(0);
      }
    };
    void loadCount();
    return () => { active = false; };
  }, [isRegister, location.pathname]);

  const handleSearch = (event) => {
    event.preventDefault();
    const query = globalSearch.trim();
    setMobileOpen(false);
    const candidateSearch = location.pathname === "/admin/candidates" || location.pathname.startsWith("/admin/workers/");
    const basePath = candidateSearch ? "/admin/candidates" : "/admin";
    navigate(query ? `${basePath}?q=${encodeURIComponent(query)}` : basePath);
  };

  const handleGlobalSearchChange = (event) => {
    const value = event.target.value;
    setGlobalSearch(value);
    const candidateSearch = location.pathname === "/admin/candidates" || location.pathname.startsWith("/admin/workers/");
    if (candidateSearch) {
      const query = value.trim();
      const leavingCandidateRecord = location.pathname.startsWith("/admin/workers/");
      const params = new URLSearchParams(location.pathname === "/admin/candidates" ? location.search : "");
      if (query) params.set("q", query);
      else params.delete("q");
      const nextSearch = params.toString();
      navigate(nextSearch ? `/admin/candidates?${nextSearch}` : "/admin/candidates", {
        replace: true,
        state: leavingCandidateRecord ? { restoreGlobalSearchFocus: true } : null,
      });
    } else if (location.pathname === "/admin") {
      const query = value.trim();
      const params = new URLSearchParams(location.search);
      if (query) params.set("q", query);
      else params.delete("q");
      const nextSearch = params.toString();
      navigate(nextSearch ? `/admin?${nextSearch}` : "/admin", { replace: true });
    }
  };

  const clearGlobalSearch = () => {
    setGlobalSearch("");
    const basePath = isCandidateWorkspace ? "/admin/candidates" : "/admin";
    const params = new URLSearchParams(location.pathname === basePath ? location.search : "");
    params.delete("q");
    const nextSearch = params.toString();
    navigate(nextSearch ? `${basePath}?${nextSearch}` : basePath, { replace: true });
  };

  const goTo = (path) => {
    setMobileOpen(false);
    if (path === "/admin/candidates") setGlobalSearch("");
    navigate(path);
  };

  const clearPendingAutoCollapse = () => {
    if (autoCollapseTimerRef.current) window.clearTimeout(autoCollapseTimerRef.current);
    autoCollapseTimerRef.current = null;
    window.sessionStorage.removeItem(NAV_AUTO_COLLAPSE_KEY);
  };

  const scheduleAutoCollapse = () => {
    clearPendingAutoCollapse();
    if (window.innerWidth <= 820) return;

    setCollapsed(false);
    window.localStorage.setItem(NAV_COLLAPSED_KEY, "false");
    const collapseAt = Date.now() + NAV_AUTO_COLLAPSE_DELAY;
    window.sessionStorage.setItem(NAV_AUTO_COLLAPSE_KEY, String(collapseAt));
    autoCollapseTimerRef.current = window.setTimeout(() => {
      setCollapsed(true);
      window.localStorage.setItem(NAV_COLLAPSED_KEY, "true");
      window.sessionStorage.removeItem(NAV_AUTO_COLLAPSE_KEY);
      autoCollapseTimerRef.current = null;
    }, NAV_AUTO_COLLAPSE_DELAY);
  };

  const goToNavItem = (path) => {
    scheduleAutoCollapse();
    goTo(path);
  };

  const toggleNavigationManually = () => {
    clearPendingAutoCollapse();
    setCollapsed((value) => {
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
      <style>{`
        :root { --uts-rail: 244px; --uts-header: 68px; --uts-safe-top: env(safe-area-inset-top, 0px); --uts-header-total: calc(var(--uts-header) + var(--uts-safe-top)); }
        * { box-sizing: border-box; }
        body.uts-operations-shell { padding-left: var(--uts-rail); background: #f4f6f8 !important; transition: padding-left .28s ease; }
        body.uts-operations-shell-collapsed { --uts-rail: 82px; }
        .uts-ops-sidebar { position: fixed; inset: 0 auto 0 0; z-index: 90; width: var(--uts-rail); display: flex; flex-direction: column; color: #e8edf3; background: #182433; border-right: 1px solid #26384c; font-family: var(--uts-font-family, Inter, ui-sans-serif, system-ui, sans-serif); font-size: 14px; line-height: 1.2; transition: width .28s ease, transform .28s ease; }
        .uts-ops-brand { min-height: var(--uts-header-total); padding: calc(10px + var(--uts-safe-top)) 18px 10px; display: flex; align-items: center; gap: 12px; border-bottom: 1px solid rgba(255,255,255,.08); cursor: pointer; overflow: hidden; }
        .uts-ops-brand img { width: 48px; height: 44px; object-fit: contain; flex: 0 0 auto; }
        .uts-ops-brand-copy { min-width: 0; white-space: nowrap; }
        .uts-ops-brand-copy strong { display: block; color: white; font-size: 13px; letter-spacing: .04em; }
        .uts-ops-brand-copy span { color: #91a3b8; font-size: 11px; }
        .uts-ops-nav { flex: 1; padding: 18px 12px; display: grid; align-content: start; gap: 5px; overflow: auto; }
        .uts-ops-section-label { padding: 9px 11px 5px; color: #71869c; font-size: 10px; font-weight: 900; letter-spacing: .12em; text-transform: uppercase; white-space: nowrap; overflow: hidden; }
        .uts-ops-nav-btn { width: 100%; min-height: 44px; padding: 10px 12px; border: 0; border-radius: 8px; display: flex; align-items: center; gap: 12px; color: #bac7d5; background: transparent; cursor: pointer; font-family: inherit; font-size: 14px; line-height: 1.2; font-weight: 700; text-align: left; white-space: nowrap; overflow: hidden; transition: .15s ease; }
        .uts-ops-nav-btn svg { flex: 0 0 auto; }
        .uts-ops-nav-btn:hover { color: white; background: rgba(255,255,255,.07); }
        .uts-ops-nav-btn.active { color: white; background: #2f6fed; box-shadow: 0 6px 18px rgba(16,77,199,.28); }
        .uts-ops-new { width: calc(100% - 24px); margin: 0 12px 14px; color: #182433; background: white; justify-content: center; }
        .uts-ops-new:hover { color: #182433; background: #edf4ff; }
        .uts-ops-sidebar-foot { padding: 12px 12px calc(12px + env(safe-area-inset-bottom, 0px)); border-top: 1px solid rgba(255,255,255,.08); display: grid; gap: 5px; }
        .uts-ops-collapse { position: absolute; right: -13px; top: 84px; width: 26px; height: 26px; border: 1px solid #d6dde6; border-radius: 50%; background: white; color: #334155; display: grid; place-items: center; cursor: pointer; box-shadow: 0 4px 10px rgba(15,23,42,.12); }
        .uts-ops-topbar { position: sticky; top: 0; z-index: 70; min-height: var(--uts-header-total); padding: var(--uts-safe-top) 28px 0; display: flex; align-items: center; gap: 20px; background: rgba(255,255,255,.96); border-bottom: 1px solid #dfe4ea; backdrop-filter: blur(12px); }
        .uts-global-search { width: min(560px, 52vw); position: relative; }
        .uts-global-search > svg { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: #78889a; }
        .uts-global-search input { width: 100%; height: 42px; padding: 0 42px; border: 1px solid #d6dde6; border-radius: 8px; background: #f7f8fa; color: #172033; outline: none; }
        .uts-global-search input:focus { border-color: #2f6fed; box-shadow: 0 0 0 3px rgba(47,111,237,.12); background: white; }
        .uts-search-clear { position: absolute; right: 8px; top: 50%; width: 28px; height: 28px; padding: 0; border: 0; border-radius: 50%; transform: translateY(-50%); display: grid; place-items: center; background: #e9edf2; color: #526276; cursor: pointer; }
        .uts-search-clear:hover { background: #dce3ea; color: #172033; }
        .uts-ops-top-actions { margin-left: auto; display: flex; align-items: center; gap: 8px; }
        .uts-ops-icon-btn { position: relative; width: 40px; height: 40px; border: 1px solid #d6dde6; border-radius: 8px; background: white; color: #425267; display: grid; place-items: center; cursor: pointer; }
        .uts-ops-mobile-menu { display: none; }
        .uts-ops-floating-menu { display: none; }
        .uts-ops-mobile-backdrop { display: none; }
        .uts-ops-badge { position: absolute; top: -6px; right: -6px; min-width: 19px; height: 19px; padding: 0 5px; border-radius: 10px; display: grid; place-items: center; background: #dc2626; color: white; font-size: 10px; font-weight: 900; box-shadow: 0 0 0 2px white; }
        .uts-public-header { min-height: 70px; padding: 10px 24px; display: flex; align-items: center; justify-content: space-between; background: #182433; }
        .uts-public-header img { height: 48px; }
        body.uts-operations-shell-collapsed .uts-ops-brand-copy,
        body.uts-operations-shell-collapsed .uts-ops-nav-btn span,
        body.uts-operations-shell-collapsed .uts-ops-section-label { display: none; }
        body.uts-operations-shell-collapsed .uts-ops-nav-btn { justify-content: center; }
        @media (prefers-reduced-motion: reduce) {
          body.uts-operations-shell, .uts-ops-sidebar { transition-duration: 0s; }
        }
        @media (max-width: 820px) {
          :root { --uts-rail: 264px; }
          body.uts-operations-shell, body.uts-operations-shell-collapsed { padding-left: 0; }
          body.uts-operations-shell-no-header { padding-top: var(--uts-safe-top); }
          .uts-ops-sidebar { transform: translateX(-105%); width: 264px; box-shadow: 18px 0 48px rgba(15,23,42,.22); }
          .uts-ops-sidebar.mobile-open { transform: translateX(0); }
          .uts-ops-sidebar.mobile-open .uts-ops-brand-copy,
          .uts-ops-sidebar.mobile-open .uts-ops-nav-btn span,
          .uts-ops-sidebar.mobile-open .uts-ops-section-label { display: block; }
          .uts-ops-sidebar.mobile-open .uts-ops-nav-btn { justify-content: flex-start; }
          .uts-ops-collapse { display: none; }
          body.uts-mobile-nav-open { overflow: hidden; touch-action: none; }
          .uts-ops-topbar { padding: var(--uts-safe-top) 14px 0; gap: 10px; }
          .uts-ops-mobile-menu { display: grid; }
          .uts-ops-floating-menu { position: fixed; top: calc(14px + var(--uts-safe-top)); left: 14px; z-index: 75; display: grid; }
          .uts-ops-mobile-backdrop { position: fixed; inset: 0; z-index: 80; display: block; border: 0; background: rgba(15,23,42,.38); opacity: 0; pointer-events: none; transition: opacity .2s ease; }
          .uts-ops-mobile-backdrop.visible { opacity: 1; pointer-events: auto; }
          .uts-ops-candidate-home { display: none; }
          .uts-global-search { width: auto; flex: 1; }
          .uts-global-search input { min-width: 0; }
          .uts-ops-icon-btn { width: 44px; height: 44px; flex: 0 0 44px; }
          .uts-global-search input { height: 44px; font-size: 16px; }
          .uts-ops-top-actions { flex: 0 0 auto; }
        }
        @media (max-width: 430px) {
          .uts-ops-topbar { padding-inline: 10px; gap: 7px; }
          .uts-global-search input { padding-left: 38px; padding-right: 36px; }
          .uts-global-search > svg { left: 12px; }
        }
      `}</style>

      <aside className={`uts-ops-sidebar ${mobileOpen ? "mobile-open" : ""}`} aria-label="Main navigation">
        <div className="uts-ops-brand" onClick={() => goToNavItem("/admin")} title="Overview">
          <img src={utsLogo} alt="UTS" />
          <div className="uts-ops-brand-copy"><strong>UNIVERSAL TALENT</strong><span>Operations workspace</span></div>
        </div>
        <button className="uts-ops-collapse" type="button" onClick={toggleNavigationManually} aria-label={collapsed ? "Expand navigation" : "Collapse navigation"} title={collapsed ? "Expand navigation" : "Collapse navigation"}>
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
        <nav className="uts-ops-nav">
          <div className="uts-ops-section-label">Workspace</div>
          {NAV_ITEMS.filter((item) => !item.supervisorOnly || canViewActivity).map((item) => {
            const Icon = item.icon;
            const adminQuery = new URLSearchParams(location.search);
            const active = item.section === "overview"
              ? location.pathname === "/admin" && adminQuery.get("view") !== "candidates"
              : item.section === "candidates"
                ? location.pathname === "/admin/candidates" || location.pathname.startsWith("/admin/workers/")
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
          <button className="uts-ops-nav-btn" type="button" onClick={() => goToNavItem("/admin/legacy")} aria-label="Legacy dashboard" title="Legacy dashboard"><LayoutDashboard size={18} /><span>Legacy dashboard</span></button>
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
        {isCandidateWorkspace ? <button className="uts-ops-icon-btn uts-ops-candidate-home" type="button" onClick={() => goTo("/admin/candidates")} aria-label="Candidate Home" title="Candidate Home">
          <Home size={19} />
        </button> : null}
        <button className="uts-ops-icon-btn uts-ops-mobile-menu" type="button" onClick={() => setMobileOpen((value) => !value)} aria-label="Open navigation">
          {mobileOpen ? <X size={19} /> : <Menu size={19} />}
        </button>
        <form className="uts-global-search" onSubmit={handleSearch} role="search">
          <Search size={18} />
          <input ref={globalSearchInputRef} value={globalSearch} onChange={handleGlobalSearchChange} placeholder={isCandidateWorkspace ? "Search by name, email, phone, state or status..." : "Search candidates by name, email or phone..."} aria-label="Search candidates" />
          {globalSearch ? <button className="uts-search-clear" type="button" onClick={clearGlobalSearch} aria-label="Clear search" title="Clear search"><X size={15} /></button> : null}
        </form>
        <div className="uts-ops-top-actions">
          {rightSlot}
          {isAdminArea ? (
            <button className="uts-ops-icon-btn" type="button" onClick={() => goTo("/admin/notifications")} aria-label={`Notifications${notificationCount ? `, ${notificationCount} pending` : ""}`}>
              <Bell size={18} />
              {notificationCount ? <span className="uts-ops-badge">{notificationCount > 99 ? "99+" : notificationCount}</span> : null}
            </button>
          ) : null}
        </div>
      </header> : null}
    </>
  );
}
