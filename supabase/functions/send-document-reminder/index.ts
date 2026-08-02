import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

const documentLabels: Record<string, string> = {
  resume: "Resume",
  state_id_or_driver_license: "State ID or Driver License",
  employment_authorization_card: "Employment Authorization Card",
  social_security_card: "Social Security Card",
  osha_card: "OSHA Card",
  other: "Other document requested by UTS",
}
const allowedDocumentTypes = new Set(Object.keys(documentLabels))
const requiredDocumentTypes = ["state_id_or_driver_license", "social_security_card"]

const respond = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })

const escapeHtml = (value: unknown) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;")

const categoryKey = (value: unknown) => String(value || "")
  .replace(/\s+-\s+(front|back)$/i, "")
  .trim()
  .toLowerCase()

const getMissingRequiredTypes = (documents: Array<{ document_type?: string | null }>) => {
  const stateDocuments = documents.filter(
    (document) => categoryKey(document.document_type) === "state id or driver license",
  )
  const stateSides = stateDocuments.map((document) => String(document.document_type || "").toLowerCase())
  const hasStateFront = stateSides.some((value) => /\s-\sfront$/.test(value))
  const hasStateBack = stateSides.some((value) => /\s-\sback$/.test(value))
  const hasSocialSecurity = documents.some(
    (document) => categoryKey(document.document_type) === "social security card",
  )

  return requiredDocumentTypes.filter((type) => {
    if (type === "state_id_or_driver_license") return !(hasStateFront && hasStateBack)
    return !hasSocialSecurity
  })
}

async function sendReminderEmail(
  worker: { id: string; name?: string | null; email?: string | null },
  documentTypes: string[],
) {
  const resendApiKey = Deno.env.get("RESEND_API_KEY")
  const from = Deno.env.get("WORKER_NOTIFICATION_FROM") || "Universal Talent Source <no-reply@uts.services>"
  const appBaseUrl = (Deno.env.get("APP_BASE_URL") || "https://universaltalentsource.com").replace(/\/$/, "")
  if (!resendApiKey) throw new Error("RESEND_API_KEY is not configured.")
  if (!worker.email) throw new Error("The candidate does not have an email address.")

  const labels = documentTypes.map((type) => documentLabels[type]).filter(Boolean)
  const documentsUrl = `${appBaseUrl}/worker/documents`
  const listHtml = labels.map((label) => `<li style="margin:8px 0;">${escapeHtml(label)}</li>`).join("")
  const listText = labels.map((label) => `- ${label}`).join("\n")
  const candidateName = worker.name?.trim() || "Candidate"

  const html = `
    <div style="margin:0;padding:0;background:#f1f5f9;color:#0f172a;font-family:Arial,sans-serif;">
      <div style="max-width:620px;margin:0 auto;padding:28px 18px;">
        <div style="background:#1f2c40;color:#fff;border-radius:18px 18px 0 0;padding:22px 26px;font-weight:900;font-size:18px;">Universal Talent Source</div>
        <div style="background:#fff;border:1px solid #dbeafe;border-top:0;border-radius:0 0 18px 18px;padding:28px 26px;">
          <h1 style="margin:0 0 12px;font-size:27px;">Documents needed for your profile</h1>
          <p style="color:#475569;line-height:1.6;">Hello ${escapeHtml(candidateName)}, please upload the following document${labels.length === 1 ? "" : "s"} to complete your UTS candidate profile:</p>
          <ul style="padding-left:22px;line-height:1.5;font-weight:700;">${listHtml}</ul>
          <a href="${escapeHtml(documentsUrl)}" style="display:inline-block;margin-top:16px;background:#1f2c40;color:#fff;text-decoration:none;border-radius:12px;padding:13px 18px;font-weight:900;">Upload documents</a>
          <p style="margin:24px 0 0;color:#64748b;font-size:13px;line-height:1.5;">Use the email address registered with UTS to receive your six-digit access code.</p>
        </div>
      </div>
    </div>`
  const text = `Hello ${candidateName},\n\nPlease upload the following documents to complete your UTS candidate profile:\n${listText}\n\nUpload documents: ${documentsUrl}`

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [worker.email],
      subject: "Reminder: documents needed for your UTS profile",
      html,
      text,
    }),
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(result?.message || `Resend returned ${response.status}.`)
  return typeof result?.id === "string" ? result.id : null
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  if (req.method !== "POST") return respond(405, { error: "Method not allowed." })

  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")
  if (!supabaseUrl || !serviceRoleKey || !anonKey) return respond(500, { error: "Supabase environment is incomplete." })

  const authorization = req.headers.get("Authorization") || ""
  const token = authorization.replace(/^Bearer\s+/i, "")
  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })

  try {
    const body = await req.json()
    if (body?.mode === "automatic") {
      if (token !== anonKey) return respond(403, { error: "Automatic reminder access denied." })

      const staleBefore = new Date(Date.now() - 30 * 60 * 1000).toISOString()
      const { data: jobs, error: jobsError } = await admin
        .from("worker_document_reminder_jobs")
        .select("worker_id,attempts,status,processing_started_at")
        .lte("scheduled_at", new Date().toISOString())
        .or(`status.eq.pending,and(status.eq.processing,processing_started_at.lt.${staleBefore})`)
        .order("scheduled_at")
        .limit(25)
      if (jobsError) throw jobsError

      let sent = 0
      for (const job of jobs || []) {
        const startedAt = new Date().toISOString()
        let claim = admin
          .from("worker_document_reminder_jobs")
          .update({ status: "processing", processing_started_at: startedAt, attempts: Number(job.attempts || 0) + 1, updated_at: startedAt })
          .eq("worker_id", job.worker_id)
        claim = job.status === "pending"
          ? claim.eq("status", "pending")
          : claim.eq("status", "processing").eq("processing_started_at", job.processing_started_at)
        const { data: claimed, error: claimError } = await claim.select("worker_id").maybeSingle()
        if (claimError || !claimed) continue

        try {
          const [{ data: worker, error: workerError }, { data: documents, error: documentsError }] = await Promise.all([
            admin.from("workers").select("id,name,email").eq("id", job.worker_id).single(),
            admin.from("worker_documents").select("document_type").eq("worker_id", job.worker_id),
          ])
          if (workerError) throw workerError
          if (documentsError) throw documentsError
          const missing = getMissingRequiredTypes(documents || [])
          let resendEmailId: string | null = null
          if (missing.length) {
            resendEmailId = await sendReminderEmail(worker, missing)
            const { error: logError } = await admin.from("worker_document_reminder_log").insert({
              worker_id: worker.id,
              reminder_kind: "automatic",
              requested_document_types: missing,
              resend_email_id: resendEmailId,
            })
            if (logError) throw logError
            sent += 1
          }
          await admin.from("worker_document_reminder_jobs").update({
            status: "sent", sent_at: new Date().toISOString(), processing_started_at: null,
            last_error: null, updated_at: new Date().toISOString(),
          }).eq("worker_id", job.worker_id)
        } catch (error) {
          await admin.from("worker_document_reminder_jobs").update({
            status: "pending", processing_started_at: null,
            last_error: error instanceof Error ? error.message.slice(0, 1000) : "Unknown reminder error",
            updated_at: new Date().toISOString(),
          }).eq("worker_id", job.worker_id)
        }
      }
      return respond(200, { processed: (jobs || []).length, sent })
    }

    if (body?.mode !== "manual") return respond(400, { error: "Invalid reminder mode." })
    const { data: authData, error: authError } = await admin.auth.getUser(token)
    if (authError || !authData.user) return respond(401, { error: "Authentication required." })
    const { data: permissions } = await admin
      .from("admin_permissions")
      .select("can_edit_workers")
      .eq("user_id", authData.user.id)
      .maybeSingle()
    if (!permissions?.can_edit_workers) return respond(403, { error: "Worker edit permission required." })

    const workerId = typeof body.workerId === "string" ? body.workerId : ""
    const documentTypes = Array.from(new Set(
      Array.isArray(body.documentTypes)
        ? body.documentTypes.filter((type: unknown): type is string => typeof type === "string" && allowedDocumentTypes.has(type))
        : [],
    ))
    if (!workerId || !documentTypes.length) return respond(400, { error: "Select at least one document." })

    const { data: worker, error: workerError } = await admin
      .from("workers").select("id,name,email").eq("id", workerId).single()
    if (workerError) throw workerError
    const resendEmailId = await sendReminderEmail(worker, documentTypes)
    const { error: logError } = await admin.from("worker_document_reminder_log").insert({
      worker_id: worker.id,
      reminder_kind: "manual",
      requested_document_types: documentTypes,
      sent_by: authData.user.id,
      resend_email_id: resendEmailId,
    })
    if (logError) throw logError
    return respond(200, { sent: true })
  } catch (error) {
    console.error("send-document-reminder failed", error)
    return respond(500, { error: error instanceof Error ? error.message : "Could not send the reminder." })
  }
})
