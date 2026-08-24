import {
  getWorkerDocumentLabel,
  getWorkerDocumentStatus,
  REQUIRED_WORKER_DOCUMENT_TYPES,
} from "./workerDocuments.js";

export const NOTIFICATION_DISMISS_KEY = "uts_admin_dismissed_notifications_v2";
export const NOTIFICATIONS_START_AT = "2026-08-24T14:33:00.000Z";

function clean(value) {
  return String(value || "").trim();
}

function makeNotification({ id, type, entityType, entityId, severity = "medium", title, body, route, actionLabel = "Open", createdAt, meta = {} }) {
  return { id, type, entityType, entityId, severity, title, body, route, actionLabel, createdAt: createdAt || new Date().toISOString(), meta };
}

export function getDismissedNotifications() {
  try {
    return new Set(JSON.parse(localStorage.getItem(NOTIFICATION_DISMISS_KEY) || "[]"));
  } catch {
    return new Set();
  }
}

export function saveDismissedNotifications(ids) {
  localStorage.setItem(NOTIFICATION_DISMISS_KEY, JSON.stringify([...ids]));
}

export function buildAdminNotifications({ workers = [], recruiterNotifications = [] } = {}) {
  const notifications = [];

  recruiterNotifications.forEach((notification) => {
    notifications.push(makeNotification({
      id: `recruiter-notification:${notification.id}`,
      type: "vetting_completed",
      entityType: "recruiter_notification",
      entityId: notification.worker_id,
      severity: "high",
      title: notification.title,
      body: notification.body,
      route: `/admin/workers/${notification.worker_id}/details`,
      actionLabel: "Open Candidate",
      createdAt: notification.created_at,
      meta: { notificationId: notification.id, persistent: true },
    }));
  });

  workers.forEach((worker) => {
    const workerName = clean(worker.name) || "Unnamed candidate";
    const detailsRoute = `/admin/workers/${worker.id}/details`;
    const workerContext = [worker.trades?.name, worker.locations?.name || worker.state].filter(Boolean).join(" · ");
    const registeredAfterReset = new Date(worker.created_at || 0) >= new Date(NOTIFICATIONS_START_AT);
    const vettedAfterReset = new Date(worker.vetting_completed_at || 0) >= new Date(NOTIFICATIONS_START_AT);

    if (registeredAfterReset && !worker.admin_reviewed_at) {
      notifications.push(makeNotification({
        id: `candidate-registered:${worker.id}`,
        type: "registered",
        entityType: "worker",
        entityId: worker.id,
        severity: "high",
        title: `Candidate registered: ${workerName}`,
        body: workerContext || "A new candidate registration is ready for review.",
        route: detailsRoute,
        actionLabel: "Review Candidate",
        createdAt: worker.created_at,
      }));
    }

    if (registeredAfterReset && !worker.vetting_completed_at) {
      notifications.push(makeNotification({
        id: `vetting-pending:${worker.id}`,
        type: "vetting_pending",
        entityType: "worker",
        entityId: worker.id,
        severity: "medium",
        title: `Vetting pending: ${workerName}`,
        body: "Call the candidate, add the interview notes, and mark vetting completed.",
        route: detailsRoute,
        actionLabel: "Open Vetting",
        createdAt: worker.created_at,
      }));
    }

    if (!vettedAfterReset) return;

    const documents = worker.worker_documents || [];
    const missingDocuments = [...REQUIRED_WORKER_DOCUMENT_TYPES]
      .filter((documentType) => !getWorkerDocumentStatus(documents, documentType).complete)
      .map(getWorkerDocumentLabel);

    if (missingDocuments.length) {
      notifications.push(makeNotification({
        id: `documents-pending:${worker.id}:${missingDocuments.join("-")}`,
        type: "documents_pending",
        entityType: "worker",
        entityId: worker.id,
        severity: "medium",
        title: `Documents pending: ${workerName}`,
        body: `Missing: ${missingDocuments.join(", ")}.`,
        route: `/admin/workers/${worker.id}/documents`,
        actionLabel: "Review Documents",
        createdAt: worker.vetting_completed_at,
        meta: { missingDocuments },
      }));
    }
  });

  const severityRank = { high: 0, medium: 1, low: 2 };
  return notifications.sort((a, b) => {
    const rank = (severityRank[a.severity] ?? 9) - (severityRank[b.severity] ?? 9);
    if (rank !== 0) return rank;
    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
  });
}

export async function loadAdminNotificationData(supabase) {
  const [workersRes, recruiterNotificationsRes] = await Promise.all([
    supabase
      .from("workers")
      .select("id,name,state,created_at,admin_reviewed_at,vetting_completed_at,trades(name),locations(name),worker_documents(document_type)")
      .order("created_at", { ascending: false }),
    supabase
      .from("recruiter_notifications")
      .select("id,worker_id,notification_type,title,body,created_at,read_at")
      .is("read_at", null)
      .order("created_at", { ascending: false }),
  ]);

  const error = workersRes.error || recruiterNotificationsRes.error;
  if (error) throw error;

  return {
    workers: workersRes.data || [],
    recruiterNotifications: recruiterNotificationsRes.data || [],
  };
}

export async function loadAdminNotificationCount(supabase) {
  const data = await loadAdminNotificationData(supabase);
  const dismissed = getDismissedNotifications();
  return buildAdminNotifications(data).filter((item) => !dismissed.has(item.id)).length;
}
