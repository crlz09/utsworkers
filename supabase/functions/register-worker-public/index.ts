import "@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
}

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
    const remoteIp =
      req.headers.get("CF-Connecting-IP") ||
      req.headers.get("X-Forwarded-For") ||
      req.headers.get("x-forwarded-for")

    if (!supabaseUrl || !supabaseKey) {
      return respond(500, { error: "Missing Supabase function environment variables." })
    }

    if (!captchaToken) {
      return respond(400, { error: "Verification is required." })
    }

    const captchaValidation = await validateTurnstile(captchaToken, remoteIp)

    if (!captchaValidation.success) {
      return respond(400, {
        error: "Verification failed. Please try again.",
        errorCodes: captchaValidation.errorCodes,
      })
    }

    const rpcPayload = {
      p_name: toRequiredString(payload.name),
      p_phone: toOptionalString(payload.phone),
      p_email: toOptionalString(payload.email),
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
      return respond(400, { error: "Please complete Name, Trade, and Location." })
    }

    if (
      rpcPayload.p_email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rpcPayload.p_email)
    ) {
      return respond(400, { error: "Please enter a valid email address." })
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseKey)
    const { data, error } = await supabaseAdmin.rpc("register_worker_public", rpcPayload)

    if (error) {
      console.error("register_worker_public failed", error)
      return respond(400, {
        error: error.message || "Something went wrong while saving the worker profile.",
      })
    }

    return respond(200, { workerId: data })
  } catch (error) {
    console.error("register-worker-public failed", error)
    return respond(500, {
      error: "Something went wrong while saving the worker profile.",
    })
  }
})
