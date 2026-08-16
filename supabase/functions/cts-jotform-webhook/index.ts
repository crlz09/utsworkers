import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "@supabase/supabase-js"

const CTS_FORM_ID = "261095938583167"

const respond = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })

const sha256 = async (value: string) => {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest("SHA-256", bytes)
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")
}

const secureEqual = async (left: string, right: string) => {
  if (!left || !right) return false
  return (await sha256(left)) === (await sha256(right))
}

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}

const findValue = (source: unknown, matcher: (key: string) => boolean): string => {
  const pending: unknown[] = [source]
  while (pending.length) {
    const current = pending.shift()
    if (!current || typeof current !== "object") continue
    for (const [key, value] of Object.entries(current as Record<string, unknown>)) {
      if (matcher(key) && ["string", "number"].includes(typeof value)) return String(value).trim()
      if (value && typeof value === "object") pending.push(value)
    }
  }
  return ""
}

const parsePayload = async (req: Request) => {
  const contentType = req.headers.get("content-type") || ""
  if (contentType.includes("application/json")) return asRecord(await req.json())
  const form = await req.formData()
  return Object.fromEntries(Array.from(form.entries()).map(([key, value]) => [key, String(value)]))
}

const numericValue = (value: unknown) => {
  const normalized = String(value ?? "").replace(/[^0-9.-]/g, "")
  const parsed = Number(normalized)
  return normalized && Number.isFinite(parsed) ? parsed : null
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return respond(405, { error: "Method not allowed." })

  const webhookSecret = Deno.env.get("JOTFORM_WEBHOOK_SECRET") || ""
  const suppliedSecret = new URL(req.url).searchParams.get("token") || ""
  if (!await secureEqual(suppliedSecret, webhookSecret)) return respond(403, { error: "Webhook access denied." })

  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  if (!supabaseUrl || !serviceRoleKey) return respond(500, { error: "Supabase environment is incomplete." })

  try {
    const payload = await parsePayload(req)
    let rawRequest: Record<string, unknown> = {}
    if (typeof payload.rawRequest === "string") {
      try { rawRequest = asRecord(JSON.parse(payload.rawRequest)) } catch { rawRequest = {} }
    } else rawRequest = asRecord(payload.rawRequest)

    const combined = { ...payload, rawRequest }
    const formId = findValue(combined, (key) => /^(formID|form_id)$/i.test(key))
    const submissionId = findValue(combined, (key) => /^(submissionID|submission_id)$/i.test(key))
    const workerId = findValue(combined, (key) => /(^|_)utsWorkerId$/i.test(key) || /utsworkerid$/i.test(key))
    if (formId !== CTS_FORM_ID) return respond(400, { error: "Unexpected Jotform form ID." })
    if (!submissionId) return respond(400, { error: "Jotform submission ID is missing." })
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(workerId)) {
      return respond(400, { error: "Candidate identifier is missing or invalid." })
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
    const { data: existing } = await admin
      .from("cts_jotform_submissions")
      .select("id,cts_job_candidate_id")
      .eq("submission_id", submissionId)
      .maybeSingle()
    if (existing) return respond(200, { received: true, duplicate: true })

    const [{ data: worker, error: workerError }, { data: defaultJob, error: jobError }] = await Promise.all([
      admin.from("workers").select("id,name,phone,rate,per_diem,trades(name),locations(name)").eq("id", workerId).maybeSingle(),
      admin.from("cts_jobs").select("id").ilike("level_type", "Default").limit(1).maybeSingle(),
    ])
    if (workerError || !worker) return respond(404, { error: "Candidate not found." })
    if (jobError || !defaultJob) return respond(500, { error: "Default CTS project is not configured." })

    const workerTrade = Array.isArray(worker.trades) ? worker.trades[0]?.name : worker.trades?.name
    const workerLocation = Array.isArray(worker.locations) ? worker.locations[0]?.name : worker.locations?.name
    const { data: currentAssignment } = await admin
      .from("cts_job_candidates")
      .select("id")
      .eq("cts_job_id", defaultJob.id)
      .eq("worker_id", worker.id)
      .maybeSingle()

    let assignmentId = currentAssignment?.id || null
    const submittedAt = new Date().toISOString()
    if (assignmentId) {
      const { error } = await admin.from("cts_job_candidates").update({
        on_system_cts: true,
        submitted_at: submittedAt,
        updated_at: submittedAt,
      }).eq("id", assignmentId)
      if (error) throw error
    } else {
      const { data: assignment, error } = await admin.from("cts_job_candidates").insert({
        cts_job_id: defaultJob.id,
        worker_id: worker.id,
        name_snapshot: worker.name,
        phone_snapshot: worker.phone,
        class_snapshot: workerTrade || null,
        location_snapshot: workerLocation || null,
        rate_snapshot: numericValue(worker.rate),
        per_diem_snapshot: worker.per_diem || null,
        candidate_status: "sourced",
        on_system_cts: true,
        submitted_at: submittedAt,
      }).select("id").single()
      if (error) throw error
      assignmentId = assignment.id
    }

    const { error: submissionError } = await admin.from("cts_jotform_submissions").insert({
      worker_id: worker.id,
      cts_job_candidate_id: assignmentId,
      form_id: formId,
      submission_id: submissionId,
      submitted_at: submittedAt,
    })
    if (submissionError?.code !== "23505" && submissionError) throw submissionError

    return respond(200, { received: true, duplicate: submissionError?.code === "23505" })
  } catch (error) {
    console.error("cts-jotform-webhook failed", error)
    return respond(500, { error: error instanceof Error ? error.message : "Could not process Jotform submission." })
  }
})
