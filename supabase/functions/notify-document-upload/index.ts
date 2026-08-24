import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@2"

const notificationRecipients = [
  "cmolina@universaltalentsource.com",
  "ealana@universaltalentsource.com",
  "andrearamirez@universaltalentsource.com",
  "mariaalana@universaltalentsource.com",
]

const respond = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })

const escapeHtml = (value: unknown) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;")

async function sendUploadEmail(
  worker: { id: string; name?: string | null; email?: string | null },
  documentTypes: string[],
  fileNames: string[],
) {
  const resendApiKey = Deno.env.get("RESEND_API_KEY")
  const from = Deno.env.get("WORKER_NOTIFICATION_FROM")
    || "Universal Talent Source <no-reply@uts.services>"
  const appBaseUrl = (Deno.env.get("APP_BASE_URL") || "https://universaltalentsource.com").replace(/\/$/, "")
  if (!resendApiKey) throw new Error("RESEND_API_KEY is not configured.")

  const candidateName = worker.name?.trim() || "Candidate"
  const adminUrl = `${appBaseUrl}/admin?q=${encodeURIComponent(candidateName)}`
  const documentsList = documentTypes
    .map((label) => `<li style="margin:8px 0;">${escapeHtml(label)}</li>`)
    .join("")
  const filesText = fileNames.map((name) => `- ${name}`).join("\n")
  const html = `
    <div style="margin:0;padding:0;background:#f1f5f9;color:#0f172a;font-family:Arial,sans-serif;">
      <div style="max-width:620px;margin:0 auto;padding:28px 18px;">
        <div style="background:#1f2c40;color:#fff;border-radius:18px 18px 0 0;padding:22px 26px;font-weight:900;font-size:18px;">Universal Talent Source</div>
        <div style="background:#fff;border:1px solid #dbeafe;border-top:0;border-radius:0 0 18px 18px;padding:28px 26px;">
          <h1 style="margin:0 0 12px;font-size:27px;">Candidate documents uploaded</h1>
          <p style="color:#475569;line-height:1.6;"><strong>${escapeHtml(candidateName)}</strong>${worker.email ? ` (${escapeHtml(worker.email)})` : ""} uploaded the following document${documentTypes.length === 1 ? "" : "s"}:</p>
          <ul style="padding-left:22px;line-height:1.5;font-weight:700;">${documentsList}</ul>
          <a href="${escapeHtml(adminUrl)}" style="display:inline-block;margin-top:16px;background:#1f2c40;color:#fff;text-decoration:none;border-radius:12px;padding:13px 18px;font-weight:900;">Review candidate documents</a>
        </div>
      </div>
    </div>`
  const text = `${candidateName}${worker.email ? ` (${worker.email})` : ""} uploaded candidate documents:\n${filesText}\n\nReview: ${adminUrl}`

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: notificationRecipients,
      subject: `Documents uploaded: ${candidateName}`,
      html,
      text,
    }),
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(result?.message || `Resend returned ${response.status}.`)
  return typeof result?.id === "string" ? result.id : null
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return respond(405, { error: "Method not allowed." })

  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")
  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return respond(500, { error: "Supabase environment is incomplete." })
  }

  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "")
  if (token !== anonKey) return respond(403, { error: "Notification access denied." })

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })

  try {
    const body = await req.json()
    if (body?.mode !== "automatic") return respond(400, { error: "Invalid notification mode." })

    const staleBefore = new Date(Date.now() - 10 * 60 * 1000).toISOString()
    const { data: jobs, error: jobsError } = await admin
      .from("worker_document_upload_notification_jobs")
      .select("worker_id,document_types,file_names,attempts,status,processing_started_at")
      .lte("scheduled_at", new Date().toISOString())
      .or(`status.eq.pending,and(status.eq.processing,processing_started_at.lt.${staleBefore})`)
      .order("scheduled_at")
      .limit(25)
    if (jobsError) throw jobsError

    let sent = 0
    for (const job of jobs || []) {
      const startedAt = new Date().toISOString()
      let claim = admin
        .from("worker_document_upload_notification_jobs")
        .update({
          status: "processing",
          processing_started_at: startedAt,
          attempts: Number(job.attempts || 0) + 1,
          updated_at: startedAt,
        })
        .eq("worker_id", job.worker_id)
      claim = job.status === "pending"
        ? claim.eq("status", "pending")
        : claim.eq("status", "processing").eq("processing_started_at", job.processing_started_at)
      const { data: claimed, error: claimError } = await claim.select("worker_id").maybeSingle()
      if (claimError || !claimed) continue

      try {
        const { data: worker, error: workerError } = await admin
          .from("workers")
          .select("id,name,email")
          .eq("id", job.worker_id)
          .single()
        if (workerError) throw workerError

        await sendUploadEmail(
          worker,
          Array.isArray(job.document_types) ? job.document_types : [],
          Array.isArray(job.file_names) ? job.file_names : [],
        )
        await admin.from("worker_document_upload_notification_jobs").update({
          status: "sent",
          sent_at: new Date().toISOString(),
          processing_started_at: null,
          last_error: null,
          updated_at: new Date().toISOString(),
        }).eq("worker_id", job.worker_id)
        sent += 1
      } catch (error) {
        await admin.from("worker_document_upload_notification_jobs").update({
          status: "pending",
          scheduled_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
          processing_started_at: null,
          last_error: error instanceof Error ? error.message.slice(0, 1000) : "Unknown notification error",
          updated_at: new Date().toISOString(),
        }).eq("worker_id", job.worker_id)
      }
    }

    return respond(200, { processed: (jobs || []).length, sent })
  } catch (error) {
    console.error("notify-document-upload failed", error)
    return respond(500, { error: error instanceof Error ? error.message : "Could not send document notifications." })
  }
})
