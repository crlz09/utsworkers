export const NOTIFICATION_DISMISS_KEY = "uts_admin_dismissed_notifications_v1";

const DAY_MS = 24 * 60 * 60 * 1000;

function clean(value) {
  return String(value || "").trim();
}

function formatAddress(worker) {
  return [worker.address, worker.city, worker.state, worker.zip_code]
    .map(clean)
    .filter(Boolean)
    .join(", ");
}

function daysSince(value) {
  const time = new Date(value || 0).getTime();
  if (!time) return 0;
  return Math.floor((Date.now() - time) / DAY_MS);
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US");
}

function startOfMonth(date) {
  const copy = new Date(date);
  copy.setDate(1);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addMonths(date, amount) {
  const copy = new Date(date);
  copy.setMonth(copy.getMonth() + amount);
  return copy;
}

function endOfMonth(date) {
  const copy = startOfMonth(addMonths(date, 1));
  copy.setMilliseconds(-1);
  return copy;
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function toDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toMonthKey(date) {
  const parsed = new Date(date || 0);
  if (Number.isNaN(parsed.getTime())) return "";
  return toDateInputValue(startOfMonth(parsed));
}

function notificationMonthStart(today = new Date()) {
  const currentMonthStart = startOfMonth(today);
  if (isSameDay(today, endOfMonth(today))) {
    return currentMonthStart;
  }
  return startOfMonth(addMonths(today, -1));
}

function formatMonth(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function parseDateInput(value) {
  const [year, month, day] = String(value || "").split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatWeekRange(value) {
  if (!value) return "—";
  const start = parseDateInput(value);
  if (Number.isNaN(start.getTime())) return "—";
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
}

function makeNotification({
  id,
  type,
  entityType,
  entityId,
  severity = "medium",
  title,
  body,
  route,
  actionLabel = "Open",
  createdAt,
  meta = {},
}) {
  return {
    id,
    type,
    entityType,
    entityId,
    severity,
    title,
    body,
    route,
    actionLabel,
    createdAt: createdAt || new Date().toISOString(),
    meta,
  };
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

export function buildAdminNotifications({
  workers = [],
  jobs = [],
  candidates = [],
  hoursEntries = [],
  workerWeeklyHours = [],
} = {}) {
  const notifications = [];
  const candidatesByJob = new Map();
  const placedByJob = new Map();
  const hoursByCandidateMonthSource = new Map();

  candidates.forEach((candidate) => {
    const jobId = candidate.cts_job_id;
    if (!jobId) return;
    candidatesByJob.set(jobId, (candidatesByJob.get(jobId) || 0) + 1);
    if (String(candidate.candidate_status || "").toLowerCase() === "placed") {
      placedByJob.set(jobId, (placedByJob.get(jobId) || 0) + 1);
    }
  });

  hoursEntries.forEach((entry) => {
    const monthKey = toMonthKey(entry.work_date || entry.week_start_date);
    if (!monthKey) return;
    const key = `${entry.cts_job_candidate_id}|${monthKey}|${entry.source}`;
    hoursByCandidateMonthSource.set(key, (hoursByCandidateMonthSource.get(key) || 0) + Number(entry.regular_hours || 0));
  });

  workers.forEach((worker) => {
    const workerName = clean(worker.name) || "Unnamed worker";
    const workerRoute = `/admin?q=${encodeURIComponent(workerName)}`;
    const workerContext = [
      worker.trades?.name,
      worker.locations?.name || worker.state,
      worker.status,
    ].filter(Boolean).join(" · ");

    if (!worker.admin_reviewed_at) {
      notifications.push(makeNotification({
        id: `worker-unreviewed:${worker.id}`,
        type: "worker",
        entityType: "worker",
        entityId: worker.id,
        severity: "high",
        title: `New worker needs review: ${workerName}`,
        body: workerContext || "Review this newly registered worker profile.",
        route: workerRoute,
        actionLabel: "Review Worker",
        createdAt: worker.created_at,
      }));
    }

    const missing = [];
    if (!clean(worker.rate)) missing.push("rate");
    if (!clean(worker.per_diem)) missing.push("per diem");
    if (!clean(worker.phone)) missing.push("phone");
    if (!clean(worker.email)) missing.push("email");
    if (!formatAddress(worker)) missing.push("address");
    if (!clean(worker.public_profile_slug)) missing.push("public profile link");

    if (missing.length > 0) {
      notifications.push(makeNotification({
        id: `worker-missing-info:${worker.id}:${missing.join("-")}`,
        type: "worker",
        entityType: "worker",
        entityId: worker.id,
        severity: missing.some((item) => ["phone", "email", "rate"].includes(item)) ? "high" : "medium",
        title: `Missing ${missing.join(", ")}: ${workerName}`,
        body: workerContext || "Complete this worker profile before sharing or assigning.",
        route: workerRoute,
        actionLabel: "Open Worker",
        createdAt: worker.updated_at || worker.created_at,
        meta: { missing },
      }));
    }

    if (!worker.admin_reviewed_at && daysSince(worker.created_at) >= 14) {
      notifications.push(makeNotification({
        id: `worker-unreviewed-stale:${worker.id}`,
        type: "worker",
        entityType: "worker",
        entityId: worker.id,
        severity: "medium",
        title: `Unreviewed 14+ days: ${workerName}`,
        body: `Registered ${formatDate(worker.created_at)}. Review or dismiss this worker task.`,
        route: workerRoute,
        actionLabel: "Open Worker",
        createdAt: worker.created_at,
      }));
    }
  });

  jobs.forEach((job) => {
    const status = String(job.status || "").toLowerCase();
    const isActiveJob = ["open", "active"].includes(status);
    if (!isActiveJob) return;

    const jobName = clean(job.level_type) || "Untitled CTS job";
    const requested = Number(job.qty || 0);
    const totalCandidates = candidatesByJob.get(job.id) || 0;
    const placedCandidates = placedByJob.get(job.id) || 0;
    const location = [job.city, job.state].filter(Boolean).join(", ");

    if (totalCandidates === 0) {
      notifications.push(makeNotification({
        id: `job-no-candidates:${job.id}`,
        type: "job",
        entityType: "job",
        entityId: job.id,
        severity: "high",
        title: `No candidates sourced: ${jobName}`,
        body: [location, `${requested || 0} requested`, status].filter(Boolean).join(" · "),
        route: `/cts-jobs/${job.id}`,
        actionLabel: "Open Job",
        createdAt: job.updated_at || job.created_at,
      }));
    } else if (requested > 0 && placedCandidates < requested) {
      notifications.push(makeNotification({
        id: `job-underfilled:${job.id}`,
        type: "job",
        entityType: "job",
        entityId: job.id,
        severity: "medium",
        title: `Underfilled job: ${jobName}`,
        body: `${placedCandidates} placed / ${requested} requested${location ? ` · ${location}` : ""}`,
        route: `/cts-jobs/${job.id}`,
        actionLabel: "Open Job",
        createdAt: job.updated_at || job.created_at,
      }));
    }
  });

  const placedCandidates = candidates.filter(
    (candidate) => String(candidate.candidate_status || "").toLowerCase() === "placed"
  );
  const monthToReview = notificationMonthStart();
  const monthToReviewKey = toDateInputValue(monthToReview);
  const monthToReviewEnd = endOfMonth(monthToReview);

  placedCandidates.forEach((candidate) => {
    const candidateName = clean(candidate.name_snapshot) || candidate.workers?.name || "Placed candidate";
    const jobName = candidate.cts_jobs?.level_type || "CTS job";
    const placedAt = new Date(candidate.updated_at || candidate.created_at || 0);
    const wasPlacedBeforeMonthClosed = !Number.isNaN(placedAt.getTime()) && placedAt <= monthToReviewEnd;
    if (!wasPlacedBeforeMonthClosed) return;

    const adminHours = hoursByCandidateMonthSource.get(`${candidate.id}|${monthToReviewKey}|admin`) || 0;
    const clientHours = hoursByCandidateMonthSource.get(`${candidate.id}|${monthToReviewKey}|client`) || 0;

    if (adminHours === 0) {
      notifications.push(makeNotification({
        id: `hours-missing-admin:${candidate.id}:${monthToReviewKey}`,
        type: "hours",
        entityType: "hours",
        entityId: candidate.id,
        severity: "medium",
        title: `Missing admin hours: ${candidateName}`,
        body: `${jobName} · ${formatMonth(monthToReviewKey)}`,
        route: "/hours",
        actionLabel: "Open Hours",
        createdAt: candidate.updated_at || candidate.created_at,
      }));
    }

    if (clientHours === 0) {
      notifications.push(makeNotification({
        id: `hours-missing-client:${candidate.id}:${monthToReviewKey}`,
        type: "hours",
        entityType: "hours",
        entityId: candidate.id,
        severity: "low",
        title: `Missing client hours: ${candidateName}`,
        body: `${jobName} · ${formatMonth(monthToReviewKey)}`,
        route: "/hours",
        actionLabel: "Open Hours",
        createdAt: candidate.updated_at || candidate.created_at,
      }));
    }

    if (adminHours > 0 && clientHours > 0 && adminHours !== clientHours) {
      notifications.push(makeNotification({
        id: `hours-discrepancy:${candidate.id}:${monthToReviewKey}`,
        type: "hours",
        entityType: "hours",
        entityId: candidate.id,
        severity: "high",
        title: `Hours discrepancy: ${candidateName}`,
        body: `${jobName} · ${formatMonth(monthToReviewKey)} · Admin ${adminHours}h / Client ${clientHours}h`,
        route: "/hours",
        actionLabel: "Review Hours",
        createdAt: candidate.updated_at || candidate.created_at,
      }));
    }
  });

  workerWeeklyHours
    .filter((submission) => submission.status === "submitted")
    .forEach((submission) => {
      const workerName = clean(submission.workers?.name) || "Worker";
      const jobName = clean(submission.cts_jobs?.level_type) || "CTS job";
      notifications.push(makeNotification({
        id: `worker-hours-submitted:${submission.id}`,
        type: "hours",
        entityType: "worker_weekly_hours",
        entityId: submission.id,
        severity: "high",
        title: `Worker hours ready to review: ${workerName}`,
        body: `${jobName} · Week of ${formatWeekRange(submission.week_start_date)}`,
        route: "/hours",
        actionLabel: "Review Hours",
        createdAt: submission.submitted_at || submission.updated_at || submission.created_at,
      }));
    });

  const severityRank = { high: 0, medium: 1, low: 2 };
  return notifications.sort((a, b) => {
    const rank = (severityRank[a.severity] ?? 9) - (severityRank[b.severity] ?? 9);
    if (rank !== 0) return rank;
    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
  });
}

export async function loadAdminNotificationData(supabase) {
  const [workersRes, jobsRes, candidatesRes, hoursRes, workerWeeklyHoursRes] = await Promise.all([
    supabase
      .from("workers")
      .select("*, trades(name), locations(name)")
      .order("created_at", { ascending: false }),
    supabase.from("cts_jobs").select("*").order("updated_at", { ascending: false, nullsFirst: false }),
    supabase
      .from("cts_job_candidates")
      .select("*, cts_jobs(level_type)")
      .order("updated_at", { ascending: false, nullsFirst: false }),
    supabase
      .from("hours_entries")
      .select("id, cts_job_candidate_id, week_start_date, work_date, source, regular_hours, updated_at")
      .gte("work_date", toDateInputValue(startOfMonth(addMonths(new Date(), -1)))),
    supabase
      .from("worker_weekly_hours")
      .select("id, week_start_date, status, submitted_at, updated_at, created_at, workers(name), cts_jobs(level_type)")
      .eq("status", "submitted"),
  ]);

  const error = workersRes.error || jobsRes.error || candidatesRes.error || hoursRes.error || workerWeeklyHoursRes.error;
  if (error) throw error;

  return {
    workers: workersRes.data || [],
    jobs: jobsRes.data || [],
    candidates: candidatesRes.data || [],
    hoursEntries: hoursRes.data || [],
    workerWeeklyHours: workerWeeklyHoursRes.data || [],
  };
}

export async function loadAdminNotificationCount(supabase) {
  const data = await loadAdminNotificationData(supabase);
  const dismissed = getDismissedNotifications();
  return buildAdminNotifications(data).filter((item) => !dismissed.has(item.id)).length;
}
