import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Loader2,
  RefreshCw,
  UserRound,
  X,
} from "lucide-react";
import UtsTopNavBar from "../components/UtsTopNavBar";
import GoToTopButton from "../components/GoToTopButton";
import { supabase } from "../lib/supabase";
import {
  buildAdminNotifications,
  getDismissedNotifications,
  loadAdminNotificationData,
  saveDismissedNotifications,
} from "../lib/adminNotifications";

const TYPE_META = {
  registered: { label: "Registered", icon: UserRound, color: "#1d4ed8", bg: "#eff6ff", border: "#bfdbfe" },
  vetting_pending: { label: "Vetting Pending", icon: Clock3, color: "#9a3412", bg: "#fff7ed", border: "#fed7aa" },
  vetting_completed: { label: "Vetting Completed", icon: CheckCircle2, color: "#166534", bg: "#f0fdf4", border: "#bbf7d0" },
  documents_pending: { label: "Documents Pending", icon: AlertTriangle, color: "#6d28d9", bg: "#f5f3ff", border: "#ddd6fe" },
};

const SEVERITY_META = {
  high: { label: "High", color: "#991b1b", bg: "#fef2f2", border: "#fecaca" },
  medium: { label: "Medium", color: "#9a3412", bg: "#fff7ed", border: "#fed7aa" },
  low: { label: "Low", color: "#166534", bg: "#f0fdf4", border: "#bbf7d0" },
};

function PageStyles() {
  return (
    <style>{`
      * { box-sizing: border-box; }

      body {
        margin: 0;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #eef4ff;
        color: #0f172a;
      }

      button, input, select { font: inherit; }

      .spin { animation: spin 1s linear infinite; }
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }

      .notifications-shell {
        min-height: 100vh;
        padding: 24px;
        background: linear-gradient(180deg, #eff6ff 0%, #f8fafc 100%);
      }

      .notifications-inner {
        max-width: 1180px;
        margin: 0 auto;
        display: grid;
        gap: 20px;
      }

      .glass-card {
        background: rgba(255,255,255,0.92);
        border: 1px solid #dbeafe;
        border-radius: 24px;
        box-shadow: 0 18px 44px rgba(15, 23, 42, 0.08);
      }

      .hero-card {
        padding: 28px;
        display: grid;
        gap: 20px;
      }

      .hero-top {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
        flex-wrap: wrap;
      }

      .brand-pill {
        display: inline-flex;
        width: fit-content;
        align-items: center;
        gap: 8px;
        padding: 8px 16px;
        border-radius: 999px;
        background: #0f172a;
        color: #ffffff;
        font-weight: 900;
        font-size: 15px;
      }

      .hero-title {
        margin: 12px 0 0;
        font-size: clamp(34px, 5vw, 46px);
        line-height: 1.04;
        letter-spacing: 0;
        font-weight: 950;
      }

      .hero-subtitle {
        margin: 10px 0 0;
        color: #475569;
        font-size: 17px;
        line-height: 1.55;
        max-width: 760px;
      }

      .btn {
        border: 1px solid #cbd5e1;
        border-radius: 14px;
        min-height: 44px;
        padding: 11px 14px;
        background: #ffffff;
        color: #0f172a;
        font-weight: 900;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
      }

      .btn.dark {
        background: #0f172a;
        border-color: #0f172a;
        color: #ffffff;
      }

      .summary-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 12px;
      }

      .metric-card {
        border: 1px solid #dbeafe;
        border-radius: 18px;
        padding: 16px;
        background: #f8fbff;
      }

      .metric-label {
        color: #64748b;
        font-size: 13px;
        font-weight: 900;
      }

      .metric-value {
        margin-top: 4px;
        color: #0f172a;
        font-size: 30px;
        font-weight: 950;
      }

      .filters-card {
        padding: 16px;
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        align-items: center;
      }

      .filter-btn {
        border: 1px solid #cbd5e1;
        background: #ffffff;
        color: #0f172a;
        border-radius: 999px;
        padding: 9px 13px;
        font-weight: 900;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 7px;
      }

      .filter-btn.active {
        background: #0f172a;
        border-color: #0f172a;
        color: #ffffff;
      }

      .notification-list {
        display: grid;
        gap: 12px;
      }

      .notification-card {
        padding: 18px;
        display: grid;
        grid-template-columns: auto minmax(0, 1fr) auto;
        gap: 14px;
        align-items: start;
      }

      .notification-icon {
        width: 46px;
        height: 46px;
        border-radius: 16px;
        display: grid;
        place-items: center;
        border: 1px solid #dbeafe;
      }

      .pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        border-radius: 999px;
        padding: 6px 9px;
        font-size: 12px;
        font-weight: 900;
      }

      .empty-state {
        padding: 28px;
        text-align: center;
        color: #475569;
        font-weight: 800;
      }

      @media (max-width: 760px) {
        .notifications-shell {
          padding: 14px;
        }

        .hero-card {
          padding: 20px;
          border-radius: 20px;
        }

        .summary-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .notification-card {
          grid-template-columns: 1fr;
        }

        .notification-actions {
          width: 100%;
          justify-content: stretch !important;
        }

        .notification-actions .btn {
          flex: 1;
        }
      }
    `}</style>
  );
}

function SeverityPill({ severity }) {
  const meta = SEVERITY_META[severity] || SEVERITY_META.medium;
  return (
    <span className="pill" style={{ color: meta.color, background: meta.bg, border: `1px solid ${meta.border}` }}>
      {meta.label}
    </span>
  );
}

function TypePill({ type }) {
  const meta = TYPE_META[type] || TYPE_META.registered;
  const Icon = meta.icon;
  return (
    <span className="pill" style={{ color: meta.color, background: meta.bg, border: `1px solid ${meta.border}` }}>
      <Icon size={13} />
      {meta.label}
    </span>
  );
}

function NotificationCard({ item, onOpen, onDismiss, onMarkReviewed }) {
  const typeMeta = TYPE_META[item.type] || TYPE_META.registered;
  const Icon = typeMeta.icon;

  return (
    <div className="glass-card notification-card">
      <div
        className="notification-icon"
        style={{
          background: typeMeta.bg,
          borderColor: typeMeta.border,
          color: typeMeta.color,
        }}
      >
        <Icon size={22} />
      </div>

      <div style={{ minWidth: 0, display: "grid", gap: 9 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <TypePill type={item.type} />
          <SeverityPill severity={item.severity} />
        </div>

        <div style={{ color: "#0f172a", fontWeight: 950, fontSize: 20, lineHeight: 1.2 }}>
          {item.title}
        </div>

        <div style={{ color: "#475569", fontWeight: 700, lineHeight: 1.5 }}>
          {item.body}
        </div>
      </div>

      <div
        className="notification-actions"
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          justifyContent: "flex-end",
        }}
      >
        {item.type === "registered" ? (
          <button className="btn" type="button" onClick={() => onMarkReviewed(item)}>
            <CheckCircle2 size={16} />
            Mark Reviewed
          </button>
        ) : null}

        <button className="btn dark" type="button" onClick={() => onOpen(item)}>
          <ExternalLink size={16} />
          {item.actionLabel}
        </button>

        <button className="btn" type="button" onClick={() => onDismiss(item)}>
          <X size={16} />
          Dismiss
        </button>
      </div>
    </div>
  );
}

export default function AdminNotificationsPage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState({ error: "", success: "" });
  const [activeFilter, setActiveFilter] = useState("all");
  const [dismissed, setDismissed] = useState(() => getDismissedNotifications());

  const load = async () => {
    setLoading(true);
    setFeedback({ error: "", success: "" });
    try {
      setData(await loadAdminNotificationData(supabase));
    } catch (error) {
      setFeedback({ error: error.message || "Could not load notifications.", success: "" });
      setData({ workers: [], recruiterNotifications: [] });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, []);

  const notifications = useMemo(
    () => buildAdminNotifications(data || {}).filter((item) => !dismissed.has(item.id)),
    [data, dismissed]
  );

  const filteredNotifications = useMemo(() => {
    if (activeFilter === "all") return notifications;
    if (activeFilter === "high") return notifications.filter((item) => item.severity === "high");
    return notifications.filter((item) => item.type === activeFilter);
  }, [activeFilter, notifications]);

  const summary = useMemo(
    () => ({
      total: notifications.length,
      high: notifications.filter((item) => item.severity === "high").length,
      registered: notifications.filter((item) => item.type === "registered").length,
      vettingPending: notifications.filter((item) => item.type === "vetting_pending").length,
      vettingCompleted: notifications.filter((item) => item.type === "vetting_completed").length,
      documentsPending: notifications.filter((item) => item.type === "documents_pending").length,
    }),
    [notifications]
  );

  const filters = [
    { value: "all", label: "All", count: summary.total },
    { value: "registered", label: "Registered", count: summary.registered },
    { value: "vetting_pending", label: "Vetting Pending", count: summary.vettingPending },
    { value: "vetting_completed", label: "Vetting Completed", count: summary.vettingCompleted },
    { value: "documents_pending", label: "Documents Pending", count: summary.documentsPending },
    { value: "high", label: "High Priority", count: summary.high },
  ];

  const markPersistentNotificationRead = async (item) => {
    const notificationId = item.meta?.notificationId;
    if (!notificationId) return true;
    const { error } = await supabase
      .from("recruiter_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", notificationId)
      .is("read_at", null);
    if (error) {
      setFeedback({ error: error.message || "Could not mark the notification as read.", success: "" });
      return false;
    }
    setData((previous) => ({
      ...previous,
      recruiterNotifications: (previous?.recruiterNotifications || []).filter((notification) => notification.id !== notificationId),
    }));
    return true;
  };

  const dismissNotification = async (item) => {
    if (item.meta?.persistent) {
      await markPersistentNotificationRead(item);
      return;
    }
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(item.id);
      saveDismissedNotifications(next);
      return next;
    });
  };

  const openNotification = async (item) => {
    if (!item.route) return;
    if (item.meta?.persistent && !(await markPersistentNotificationRead(item))) return;
    if (item.route.startsWith("/admin") || item.route.startsWith("/hours")) {
      window.open(item.route, "_blank", "noopener,noreferrer");
      return;
    }
    navigate(item.route);
  };

  const markWorkerReviewed = async (item) => {
    const reviewedAt = new Date().toISOString();
    const { error } = await supabase
      .from("workers")
      .update({ admin_reviewed_at: reviewedAt })
      .eq("id", item.entityId)
      .is("admin_reviewed_at", null);

    if (error) {
      setFeedback({ error: error.message || "Could not mark worker reviewed.", success: "" });
      return;
    }

    setFeedback({ error: "", success: "Worker marked as reviewed." });
    setData((prev) => ({
      ...prev,
      workers: (prev?.workers || []).map((worker) =>
        worker.id === item.entityId ? { ...worker, admin_reviewed_at: reviewedAt } : worker
      ),
    }));

    if (item.route?.startsWith("/admin")) {
      window.open(item.route, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <>
      <PageStyles />
      <UtsTopNavBar />

      <main className="notifications-shell">
        <div className="notifications-inner">
          <section className="glass-card hero-card">
            <div className="hero-top">
              <div>
                <div className="brand-pill">
                  <Bell size={16} />
                  Admin Notifications
                </div>
                <h1 className="hero-title">Tasks & Attention</h1>
                <p className="hero-subtitle">
                  Track new registrations, vetting handoffs, and required candidate documents.
                </p>
              </div>

              <button className="btn" type="button" onClick={load} disabled={loading}>
                {loading ? <Loader2 className="spin" size={16} /> : <RefreshCw size={16} />}
                Refresh
              </button>
            </div>

            <div className="summary-grid">
              <div className="metric-card">
                <div className="metric-label">Total Tasks</div>
                <div className="metric-value">{summary.total}</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">High Priority</div>
                <div className="metric-value">{summary.high}</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Vetting Pending</div>
                <div className="metric-value">{summary.vettingPending}</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Documents Pending</div>
                <div className="metric-value">{summary.documentsPending}</div>
              </div>
            </div>
          </section>

          <section className="glass-card filters-card">
            {filters.map((filter) => (
              <button
                key={filter.value}
                type="button"
                className={`filter-btn ${activeFilter === filter.value ? "active" : ""}`}
                onClick={() => setActiveFilter(filter.value)}
              >
                {filter.label}: {filter.count}
              </button>
            ))}
          </section>

          {feedback.error ? (
            <div className="glass-card" style={{ padding: 16, color: "#991b1b", fontWeight: 900 }}>
              {feedback.error}
            </div>
          ) : null}

          {feedback.success ? (
            <div className="glass-card" style={{ padding: 16, color: "#166534", fontWeight: 900 }}>
              {feedback.success}
            </div>
          ) : null}

          {loading ? (
            <div className="glass-card empty-state">
              <Loader2 className="spin" size={18} style={{ verticalAlign: "middle", marginRight: 8 }} />
              Loading notifications...
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="glass-card empty-state">
              <CheckCircle2 size={28} style={{ marginBottom: 8 }} />
              <div>No notifications in this view.</div>
            </div>
          ) : (
            <section className="notification-list">
              {filteredNotifications.map((item) => (
                <NotificationCard
                  key={item.id}
                  item={item}
                  onOpen={openNotification}
                  onDismiss={dismissNotification}
                  onMarkReviewed={markWorkerReviewed}
                />
              ))}
            </section>
          )}
        </div>
      </main>

      <GoToTopButton showAfter={600} />
    </>
  );
}
