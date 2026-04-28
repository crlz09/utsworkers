import "@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
}

const RATE_LIMIT_WINDOW_MINUTES = 15
const RATE_LIMIT_MAX_ATTEMPTS = 5

const respond = (status: number, payload: Record<string, unknown>) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: corsHeaders,
  })

const toOptionalString = (value: unknown) => {
  const trimmed = String(value ?? "").trim()
  return trimmed || null
}

const toRequiredString = (value: unknown) => String(value ?? "").trim()

const toNumberValue = (value: unknown) => {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
  }

const toStringArray = (value: unknown) =>
  Array.isArray(value)
    ? value.map((item) => String(item ?? "").trim()).filter(Boolean)
    : []

const getRemoteIp = (req: Request) => {
  const forwarded =
    req.headers.get("CF-Connecting-IP") ||
    req.headers.get("X-Forwarded-For") ||
    req.headers.get("x-forwarded-for") ||
    ""

  return forwarded
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)[0] || null
}

const summarizePayload = (payload: Record<string, unknown>) => ({
  name: toRequiredString(payload.name),
  email: toOptionalString(payload.email),
  address: toOptionalString(payload.address),
  zip_code: toOptionalString(payload.zip_code),
  city: toOptionalString(payload.city),
  state: toOptionalString(payload.state),
  trade_id: toOptionalString(payload.trade_id),
  location_id: toOptionalString(payload.location_id),
  languages_count: toStringArray(payload.languages).length,
  skills_count: Array.isArray(payload.selectedSkillIds) ? payload.selectedSkillIds.length : 0,
  certifications_count: Array.isArray(payload.selectedCertificationIds)
    ? payload.selectedCertificationIds.length
    : 0,
  projects_count: Array.isArray(payload.projects) ? payload.projects.length : 0,
})

const toProjectPayload = (value: unknown) => {
  if (!Array.isArray(value)) return []

  return value
    .map((project, index) => {
      const row =
        typeof project === "object" && project !== null
          ? (project as Record<string, unknown>)
          : {}

      const project_name = toRequiredString(row.project_name)
      const project_location = toRequiredString(row.project_location)
      const duration = toRequiredString(row.duration)
      const description = toRequiredString(row.description)

      if (!project_name && !project_location && !duration && !description) {
        return null
      }

      return {
        project_name,
        project_location,
        duration,
        description,
        sort_order: index + 1,
      }
    })
    .filter(Boolean)
}

async function validateTurnstile(token: string, remoteIp: string | null) {
  const turnstileSecretKey = Deno.env.get("TURNSTILE_SECRET_KEY")

  if (!turnstileSecretKey) {
    return { success: false, errorCodes: ["turnstile-secret-missing"] }
  }

  const body = new URLSearchParams({
    secret: turnstileSecretKey,
    response: token,
    idempotency_key: crypto.randomUUID(),
  })

  if (remoteIp) {
    body.set("remoteip", remoteIp)
  }

  const response = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    },
  )

  if (!response.ok) {
    return { success: false, errorCodes: ["turnstile-request-failed"] }
  }

  const result = await response.json()
  return {
    success: !!result.success,
    errorCodes: Array.isArray(result["error-codes"]) ? result["error-codes"] : [],
  }
}

async function logAttempt(
  supabaseAdmin: ReturnType<typeof createClient>,
  {
    ipAddress,
    userAgent,
    outcome,
    reason,
    turnstileErrorCodes = [],
    workerId = null,
    payloadSummary = {},
  }: {
    ipAddress: string | null
    userAgent: string | null
    outcome: string
    reason?: string | null
    turnstileErrorCodes?: string[]
    workerId?: string | null
    payloadSummary?: Record<string, unknown>
  },
) {
  const { error } = await supabaseAdmin.from("public_registration_attempts").insert({
    ip_address: ipAddress,
    user_agent: userAgent,
    outcome,
    reason: reason || null,
    turnstile_error_codes: turnstileErrorCodes,
    worker_id: workerId,
    payload_summary: payloadSummary,
  })

  if (error) {
    console.error("Failed to log registration attempt", error)
  }
}

async function isRateLimited(
  supabaseAdmin: ReturnType<typeof createClient>,
  ipAddress: string | null,
) {
  if (!ipAddress) return false

  const windowStart = new Date(
    Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000,
  ).toISOString()

  const { count, error } = await supabaseAdmin
    .from("public_registration_attempts")
    .select("id", { count: "exact", head: true })
    .eq("ip_address", ipAddress)
    .gte("created_at", windowStart)

  if (error) {
    console.error("Failed to check rate limit", error)
    return false
  }

  return (count || 0) >= RATE_LIMIT_MAX_ATTEMPTS
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (req.method !== "POST") {
    return respond(405, { error: "Method not allowed." })
  }

  try {
    const body = await req.json()
    const payload = typeof body === "object" && body !== null ? body as Record<string, unknown> : {}
    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    const supabaseKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
      Deno.env.get("SUPABASE_ANON_KEY")

    const captchaToken = toRequiredString(payload.captchaToken)
    const remoteIp = getRemoteIp(req)
    const userAgent = req.headers.get("user-agent")
    const payloadSummary = summarizePayload(payload)
    const honeypot = toRequiredString(payload.company)

    if (!supabaseUrl || !supabaseKey) {
      return respond(500, { error: "Missing Supabase function environment variables." })
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseKey)

    if (honeypot) {
      await logAttempt(supabaseAdmin, {
        ipAddress: remoteIp,
        userAgent,
        outcome: "blocked",
        reason: "honeypot_triggered",
        payloadSummary,
      })
      return respond(400, { error: "Could not verify submission. Please try again." })
    }

    if (await isRateLimited(supabaseAdmin, remoteIp)) {
      await logAttempt(supabaseAdmin, {
        ipAddress: remoteIp,
        userAgent,
        outcome: "rate_limited",
        reason: "too_many_attempts",
        payloadSummary,
      })
      return respond(429, {
        error: "Too many attempts. Please wait a few minutes before trying again.",
      })
    }

    if (!captchaToken) {
      await logAttempt(supabaseAdmin, {
        ipAddress: remoteIp,
        userAgent,
        outcome: "blocked",
        reason: "captcha_missing",
        payloadSummary,
      })
      return respond(400, { error: "Verification is required." })
    }

    const captchaValidation = await validateTurnstile(captchaToken, remoteIp)

    if (!captchaValidation.success) {
      await logAttempt(supabaseAdmin, {
        ipAddress: remoteIp,
        userAgent,
        outcome: "blocked",
        reason: "turnstile_failed",
        turnstileErrorCodes: captchaValidation.errorCodes,
        payloadSummary,
      })
      return respond(400, {
        error: "Verification failed. Please try again.",
        errorCodes: captchaValidation.errorCodes,
      })
    }

    const rpcPayload = {
      p_name: toRequiredString(payload.name),
      p_phone: toOptionalString(payload.phone),
      p_email: toOptionalString(payload.email),
      p_address: toOptionalString(payload.address),
      p_zip_code: toOptionalString(payload.zip_code),
      p_city: toOptionalString(payload.city),
      p_state: toOptionalString(payload.state),
      p_location_id: toRequiredString(payload.location_id),
      p_trade_id: toRequiredString(payload.trade_id),
      p_total_experience_years: toNumberValue(payload.total_experience_years),
      p_commercial_experience_years: toNumberValue(payload.commercial_experience_years),
      p_industrial_experience_years: toNumberValue(payload.industrial_experience_years),
      p_residential_experience_years: toNumberValue(payload.residential_experience_years),
      p_strengths: toOptionalString(payload.strengths),
      p_needs_improvement: toOptionalString(payload.needs_improvement),
      p_available_from: null,
      p_willing_to_travel: true,
      p_languages: toStringArray(payload.languages),
      p_skill_ids: Array.isArray(payload.selectedSkillIds) ? payload.selectedSkillIds : [],
      p_certification_ids: Array.isArray(payload.selectedCertificationIds) ? payload.selectedCertificationIds : [],
      p_projects: toProjectPayload(payload.projects),
    }

    if (!rpcPayload.p_name || !rpcPayload.p_trade_id || !rpcPayload.p_location_id) {
      await logAttempt(supabaseAdmin, {
        ipAddress: remoteIp,
        userAgent,
        outcome: "blocked",
        reason: "required_fields_missing",
        payloadSummary,
      })
      return respond(400, { error: "Please complete Name, Trade, and Location." })
    }

    if (
      rpcPayload.p_email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rpcPayload.p_email)
    ) {
      await logAttempt(supabaseAdmin, {
        ipAddress: remoteIp,
        userAgent,
        outcome: "blocked",
        reason: "invalid_email",
        payloadSummary,
      })
      return respond(400, { error: "Please enter a valid email address." })
    }

    const { data, error } = await supabaseAdmin.rpc("register_worker_public", rpcPayload)

    if (error) {
      console.error("register_worker_public failed", error)
      await logAttempt(supabaseAdmin, {
        ipAddress: remoteIp,
        userAgent,
        outcome: "blocked",
        reason: error.message || "rpc_failed",
        payloadSummary,
      })
      return respond(400, {
        error: error.message || "Something went wrong while saving the worker profile.",
      })
    }

    await logAttempt(supabaseAdmin, {
      ipAddress: remoteIp,
      userAgent,
      outcome: "success",
      reason: "worker_registered",
      workerId: typeof data === "string" ? data : null,
      payloadSummary,
    })

    return respond(200, { workerId: data })
  } catch (error) {
    console.error("register-worker-public failed", error)
    return respond(500, {
      error: "Something went wrong while saving the worker profile.",
    })
  }
})
