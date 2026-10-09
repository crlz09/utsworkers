export const PLANNER_COLUMNS = [
  { id: "unassigned", label: "To assign", color: "#8b5cf6" },
  { id: "pending", label: "To do", color: "#3b82f6" },
  { id: "in_progress", label: "In progress", color: "#f59e0b" },
  { id: "waiting", label: "Waiting", color: "#ec4899" },
  { id: "completed", label: "Done", color: "#10b981" },
];
export function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function dueState(task, today = localDateKey()) {
  if (!task.due_date || task.status === "completed" || task.archived_at)
    return "";
  return task.due_date < today
    ? "overdue"
    : task.due_date === today
      ? "today"
      : "upcoming";
}
export function matchesPlannerFilter(
  task,
  { query = "", filter = "all", userId, today = localDateKey() } = {},
) {
  if (filter === "mine" && task.assignee_id !== userId) return false;
  if (filter === "unassigned" && task.assignee_id) return false;
  if (filter === "today" && dueState(task, today) !== "today") return false;
  if (filter === "overdue" && dueState(task, today) !== "overdue") return false;
  return `${task.title} ${task.description}`
    .toLowerCase()
    .includes(query.trim().toLowerCase());
}
export function positionBetween(before, after) {
  if (before == null && after == null) return 1024;
  if (before == null) return after - 1024;
  if (after == null) return before + 1024;
  return (before + after) / 2;
}
export async function loadPlannerCount(client) {
  const { count, error } = await client
    .from("planner_tasks")
    .select("id", { count: "exact", head: true })
    .is("archived_at", null)
    .neq("status", "completed");
  if (error) throw error;
  return count || 0;
}
export function validatePlannerImage(file) {
  if (
    !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)
  )
    throw new Error("Choose a JPG, PNG, WebP or GIF image.");
  if (file.size > 10 * 1024 * 1024)
    throw new Error("Each image must be 10 MB or smaller.");
}
