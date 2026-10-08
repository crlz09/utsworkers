import {
  adminClient,
  check,
  digest,
  syncScreenings,
  toBase64,
  uploadPdf,
} from "../_shared/screening-server.ts";
import {
  SCREENING_BUCKET,
  MAILBOX,
  emailHtml,
  normalizeEmail,
  validateOrder,
  validateScreeningResult,
} from "../_shared/screening.js";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const respond = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
const fields = [
  "candidate_name",
  "recipient_email",
  "confirmation_number",
  "lab_name",
  "lab_address",
  "lab_phone",
  "testing_hours",
  "change_contact",
];
const textFields = (body: Record<string, unknown>) =>
  Object.fromEntries(
    fields.map((field) => [
      field,
      String(body[field] || "")
        .trim()
        .slice(0, 2000),
    ]),
  );

const screeningSender = () =>
  Deno.env.get("SCREENING_EMAIL_FROM") ||
  Deno.env.get("WORKER_NOTIFICATION_FROM") ||
  "";
const gmailConfigured = () =>
  [
    "SCREENING_GOOGLE_CLIENT_ID",
    "SCREENING_GOOGLE_CLIENT_SECRET",
    "SCREENING_GOOGLE_REFRESH_TOKEN",
  ].every((key) => !!Deno.env.get(key));

export function createScreeningHandler(adminFactory = adminClient) {
  return async (request: Request) => {
    if (request.method === "OPTIONS")
      return new Response("ok", { headers: cors });
    if (request.method !== "POST")
      return respond(405, { error: "POST required." });
    const admin = adminFactory();
    try {
      if (Number(request.headers.get("content-length") || 0) > 12 * 1024 * 1024)
        return respond(413, { error: "Upload a file up to 10 MB." });
      const multipart = request.headers
        .get("content-type")
        ?.includes("multipart/form-data");
      const form = multipart ? await request.formData() : null;
      const body = form
        ? JSON.parse(String(form.get("data") || "{}"))
        : await request.json();
      const bearer =
        request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") || "";
      const syncSecret = Deno.env.get("SCREENING_SYNC_SECRET") || "";
      // Dedicated cron credentials can ONLY import Gmail orders, never send candidate email.
      const cron =
        body.action === "sync" &&
        syncSecret.length >= 32 &&
        bearer === syncSecret;
      let actor: string | null = null;
      if (!cron) {
        const { data, error } = await admin.auth.getUser(bearer);
        if (error || !data.user)
          return respond(401, { error: "Sign in to continue." });
        actor = data.user.id;
        const permission = check(
          await admin
            .from("admin_permissions")
            .select("can_edit_workers,can_delete_workers")
            .eq("user_id", actor)
            .maybeSingle(),
        );
        if (!permission?.can_edit_workers && !permission?.can_delete_workers)
          return respond(403, {
            error: "Candidate administration access required.",
          });
        if (body.action !== "configuration" && !permission?.can_edit_workers)
          return respond(403, { error: "Candidate edit permission required." });
      }
      if (body.action === "configuration")
        return respond(200, {
          mailbox: MAILBOX,
          gmailConfigured: gmailConfigured(),
          emailConfigured:
            !!Deno.env.get("RESEND_API_KEY") && !!screeningSender(),
          sender: screeningSender(),
        });
      if (body.action === "sync") {
        if (cron && !gmailConfigured())
          return respond(200, {
            skipped: true,
            reason: "gmail_not_configured",
          });
        return respond(200, await syncScreenings(admin));
      }
      if (body.action === "import") {
        const values = textFields(body);
        values.confirmation_number = values.confirmation_number.toUpperCase();
        values.recipient_email = normalizeEmail(values.recipient_email);
        validateOrder(values);
        const file = form?.get("pdf");
        if (!(file instanceof File))
          return respond(400, { error: "Attach the original ePassport PDF." });
        const existing = check(
          await admin
            .from("candidate_screenings")
            .select("id")
            .eq("confirmation_number", values.confirmation_number)
            .maybeSingle(),
        );
        if (existing)
          return respond(409, {
            error:
              "This confirmation number is already in the onboarding inbox.",
          });
        const id = crypto.randomUUID(),
          path = `${id}/order.pdf`;
        const bytes = new Uint8Array(await file.arrayBuffer());
        await uploadPdf(admin, path, bytes);
        const result = await admin
          .from("candidate_screenings")
          .insert({
            ...values,
            id,
            source: "manual",
            created_by: actor,
            source_subject: String(body.source_subject || "").slice(0, 2000),
            source_text: String(body.source_text || "").slice(0, 50000),
            file_path: path,
            file_name: file.name.slice(0, 255),
            file_size: bytes.length,
            file_sha256: await digest(bytes),
          })
          .select("id")
          .single();
        if (result.error) {
          await admin.storage.from(SCREENING_BUCKET).remove([path]);
          throw result.error;
        }
        return respond(200, { id });
      }
      if (typeof body.id !== "string")
        return respond(400, { error: "Select a screening order." });
      const order = check(
        await admin
          .from("candidate_screenings")
          .select("*")
          .eq("id", body.id)
          .single(),
      );
      if (!order) return respond(404, { error: "Order not found." });
      const update = async (
        patch: Record<string, unknown>,
        version = body.version,
      ) => {
        if (!version) throw new Error("Refresh this order before saving.");
        const result = check(
          await admin
            .from("candidate_screenings")
            .update({ ...patch, updated_by: actor })
            .eq("id", order.id)
            .eq("updated_at", version)
            .select("*")
            .maybeSingle(),
        );
        if (!result)
          throw new Error("This order changed. Refresh it before continuing.");
        return result;
      };
      if (body.action === "save") {
        if (order.send_state !== "none")
          return respond(409, {
            error:
              "An attempted email locks this order's candidate and instructions.",
          });
        const values = textFields(body);
        values.confirmation_number = order.confirmation_number;
        values.recipient_email = normalizeEmail(values.recipient_email);
        validateOrder(values);
        if (!body.workerId || body.identityConfirmed !== true)
          return respond(400, {
            error: "Review the PDF and confirm the candidate's identity.",
          });
        const worker = check(
          await admin
            .from("workers")
            .select("id,name,email")
            .eq("id", body.workerId)
            .single(),
        );
        if (
          !worker?.email ||
          normalizeEmail(worker.email) !== values.recipient_email
        )
          return respond(400, {
            error:
              "The recipient must match the selected candidate's profile email. Correct the profile or recipient first.",
          });
        await update({
          ...values,
          worker_id: worker.id,
          identity_verified_at: new Date().toISOString(),
          identity_verified_by: actor,
        });
        return respond(200, { saved: true });
      }
      if (body.action === "send") {
        if (order.send_state === "sent")
          return respond(200, { sent: true, alreadySent: true });
        const apiKey = Deno.env.get("RESEND_API_KEY"),
          from = screeningSender();
        if (!apiKey || !from)
          return respond(503, {
            error: "Configure the screening sender and Resend before sending.",
          });
        if (!order.worker_id || !order.identity_verified_at)
          return respond(400, {
            error: "Save and verify the candidate before sending.",
          });
        validateOrder(order);
        let delivery = order;
        if (order.send_state === "none") {
          if (body.reviewed !== true)
            return respond(400, {
              error: "Review the recipient, PDF, and message before sending.",
            });
          const worker = check(
            await admin
              .from("workers")
              .select("id,email")
              .eq("id", order.worker_id)
              .single(),
          );
          if (
            !worker?.email ||
            normalizeEmail(worker.email) !==
              normalizeEmail(order.recipient_email)
          )
            return respond(409, {
              error:
                "The candidate's profile email changed. Review and save the order again.",
            });
          const subject = String(body.subject || "").trim(),
            emailBody = String(body.emailBody || "").trim();
          if (
            !subject ||
            subject.length > 250 ||
            /[\r\n]/.test(subject) ||
            !emailBody ||
            emailBody.length > 20000
          )
            return respond(400, {
              error:
                "Enter a subject up to 250 characters and a message up to 20,000 characters.",
            });
          delivery = await update({
            send_state: "sending",
            send_started_at: new Date().toISOString(),
            sent_by: actor,
            email_to: worker.email,
            email_from: from,
            email_subject: subject,
            email_body: emailBody,
            email_language: body.language === "en" ? "en" : "es",
            last_send_error: null,
          });
        }
        // Resend retains idempotency keys for 24 hours. Never automatically resend after that window.
        if (
          Date.now() - new Date(delivery.send_started_at).getTime() >
          23 * 3600000
        )
          return respond(409, {
            error:
              "Delivery is uncertain and the safe retry window expired. Check this order's email in Resend before taking further action.",
          });
        try {
          const file = check(
            await admin.storage
              .from(SCREENING_BUCKET)
              .download(delivery.file_path),
          );
          if (!file)
            throw new Error("The original PDF could not be downloaded.");
          const bytes = new Uint8Array(await file.arrayBuffer());
          if ((await digest(bytes)) !== delivery.file_sha256)
            throw new Error(
              "The PDF no longer matches the original order. Sending stopped.",
            );
          const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
              "Idempotency-Key": `screening/${delivery.id}`,
            },
            body: JSON.stringify({
              from: delivery.email_from,
              to: [delivery.email_to],
              reply_to: MAILBOX,
              subject: delivery.email_subject,
              text: delivery.email_body,
              html: emailHtml(delivery.email_body),
              attachments: [
                { filename: delivery.file_name, content: toBase64(bytes) },
              ],
            }),
            signal: AbortSignal.timeout(25000),
          });
          const responseBody = await response.json();
          if (!response.ok || !responseBody.id)
            throw new Error(
              `Email provider returned ${response.status}. Retry the same saved message within 23 hours.`,
            );
          check(
            await admin
              .from("candidate_screenings")
              .update({
                send_state: "sent",
                sent_at: new Date().toISOString(),
                resend_email_id: responseBody.id,
                last_send_error: null,
              })
              .eq("id", order.id)
              .eq("send_state", "sending"),
          );
          return respond(200, { sent: true });
        } catch (error) {
          await admin
            .from("candidate_screenings")
            .update({
              last_send_error:
                error instanceof Error
                  ? error.message
                  : "Delivery is uncertain. Retry the same saved message.",
            })
            .eq("id", order.id)
            .eq("send_state", "sending");
          throw error;
        }
      }
      if (body.action === "reconcile") {
        if (order.send_state !== "sending")
          return respond(409, {
            error: "Only unconfirmed sends can be reconciled.",
          });
        const apiKey = Deno.env.get("RESEND_API_KEY");
        if (!apiKey)
          return respond(503, {
            error: "Configure Resend before checking delivery.",
          });
        const providerId = String(body.providerId || "").trim();
        if (!/^[a-zA-Z0-9-]{8,100}$/.test(providerId))
          return respond(400, { error: "Enter the email ID from Resend." });
        const response = await fetch(
          `https://api.resend.com/emails/${providerId}`,
          {
            headers: { Authorization: `Bearer ${apiKey}` },
            signal: AbortSignal.timeout(20000),
          },
        );
        if (!response.ok)
          return respond(400, {
            error: "Resend could not verify this email ID.",
          });
        const record = await response.json();
        const timestamp = new Date(record.created_at).getTime(),
          started = new Date(order.send_started_at).getTime();
        if (
          record.id !== providerId ||
          record.to?.length !== 1 ||
          normalizeEmail(record.to[0]) !== normalizeEmail(order.email_to) ||
          record.subject !== order.email_subject ||
          record.text !== order.email_body ||
          !Number.isFinite(timestamp) ||
          timestamp < started - 120000 ||
          timestamp > started + 24 * 3600000
        )
          return respond(409, {
            error:
              "This provider email does not match the saved recipient, message, and send window.",
          });
        await update({
          send_state: "sent",
          sent_at: new Date(timestamp).toISOString(),
          resend_email_id: providerId,
          last_send_error: null,
        });
        return respond(200, { verified: true });
      }
      if (body.action === "attendance") {
        if (!order.worker_id)
          return respond(400, { error: "Verify the candidate first." });
        if (order.attendance_reported_at) return respond(200, { saved: true });
        const note = String(body.note || "").trim();
        if (!note)
          return respond(400, {
            error: "Record who reported attendance and when.",
          });
        await update({
          attendance_reported_at: new Date().toISOString(),
          attendance_note: note.slice(0, 5000),
        });
        return respond(200, { saved: true });
      }
      if (body.action === "result") {
        if (!order.worker_id)
          return respond(400, { error: "Verify the candidate first." });
        if (order.result_received_at)
          return respond(409, {
            error: "A result is already recorded for this order.",
          });
        const file = form?.get("pdf");
        if (!(file instanceof File))
          return respond(400, {
            error: "Attach the result PDF or photo.",
          });
        const note = String(body.note || "").trim();
        if (!note)
          return respond(400, {
            error: "Record the result's source and receipt date.",
          });
        const bytes = new Uint8Array(await file.arrayBuffer());
        const format = validateScreeningResult(bytes);
        const path = `${order.id}/result-${crypto.randomUUID()}.${format.extension}`;
        check(
          await admin.storage.from(SCREENING_BUCKET).upload(path, bytes, {
            contentType: format.contentType,
            upsert: false,
          }),
        );
        try {
          await update({
            result_file_path: path,
            result_file_name: file.name.slice(0, 255),
            result_file_type: format.contentType,
            result_file_size: bytes.length,
            result_received_at: new Date().toISOString(),
            result_note: note.slice(0, 5000),
          });
        } catch (error) {
          await admin.storage.from(SCREENING_BUCKET).remove([path]);
          throw error;
        }
        return respond(200, { saved: true });
      }
      return respond(400, { error: "Unsupported screening action." });
    } catch (error) {
      return respond(400, {
        error:
          error instanceof Error
            ? error.message
            : "The screening action failed. Refresh and try again.",
      });
    }
  };
}
