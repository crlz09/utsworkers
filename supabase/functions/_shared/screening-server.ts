import { createClient } from "npm:@supabase/supabase-js@2.101.1";
import {
  SCREENING_BUCKET,
  MAILBOX,
  matchCandidate,
  parseScreening,
  validatePdf,
} from "./screening.js";

export const adminClient = () =>
  createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
export type Admin = ReturnType<typeof adminClient>;
export const check = <T>(result: { data: T; error: unknown }): T => {
  if (result.error)
    throw new Error(
      typeof result.error === "object" && "message" in result.error
        ? String(result.error.message)
        : "The database request failed.",
    );
  return result.data;
};
export function toBase64(bytes: Uint8Array) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192)
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(binary);
}
export function fromBase64Url(value: string) {
  return Uint8Array.from(
    atob(value.replaceAll("-", "+").replaceAll("_", "/")),
    (c) => c.charCodeAt(0),
  );
}
export async function digest(bytes: Uint8Array) {
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new Uint8Array(bytes).buffer,
  );
  return [...new Uint8Array(hash)]
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("");
}
export async function uploadPdf(admin: Admin, path: string, bytes: Uint8Array) {
  validatePdf(bytes);
  check(
    await admin.storage
      .from(SCREENING_BUCKET)
      .upload(path, bytes, { contentType: "application/pdf", upsert: false }),
  );
}
export async function gmailToken() {
  const clientId = Deno.env.get("SCREENING_GOOGLE_CLIENT_ID");
  const clientSecret = Deno.env.get("SCREENING_GOOGLE_CLIENT_SECRET");
  const refreshToken = Deno.env.get("SCREENING_GOOGLE_REFRESH_TOKEN");
  if (!clientId || !clientSecret || !refreshToken)
    throw new Error(
      "Gmail is not configured. An administrator must connect the screening mailbox; manual PDF import is available.",
    );
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
    signal: AbortSignal.timeout(20000),
  });
  const data = await response.json();
  if (!response.ok || !data.access_token)
    throw new Error(
      "Gmail authorization expired or was rejected. Reconnect the screening mailbox.",
    );
  return data.access_token as string;
}
async function gmailGet(token: string, path: string) {
  const response = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/${path}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(20000),
    },
  );
  if (!response.ok)
    throw new Error(
      `Gmail read failed (${response.status}). Retry sync or reconnect the mailbox.`,
    );
  return await response.json();
}
type MimePart = {
  mimeType?: string;
  filename?: string;
  body?: { data?: string; attachmentId?: string; size?: number };
  parts?: MimePart[];
};
function flatten(part: MimePart): MimePart[] {
  return [part, ...(part.parts || []).flatMap(flatten)];
}

export async function syncScreenings(admin: Admin) {
  const now = new Date();
  const lease = new Date(now.getTime() + 240000).toISOString();
  const state = check(
    await admin
      .from("screening_sync_state")
      .update({ lock_until: lease })
      .eq("id", true)
      .lt("lock_until", now.toISOString())
      .select("*")
      .maybeSingle(),
  );
  if (!state)
    throw new Error("A Gmail sync is already running. Try again shortly.");
  let imported = 0,
    duplicates = 0;
  const errors: string[] = [];
  try {
    const token = await gmailToken();
    const profile = await gmailGet(token, "profile");
    if (profile.emailAddress?.toLowerCase() !== MAILBOX)
      throw new Error(`Connect ${MAILBOX} to import screening orders.`);
    const after = Math.floor(
      (state.last_completed_at
        ? new Date(state.last_completed_at).getTime() - 2 * 86400000
        : now.getTime() - 90 * 86400000) / 1000,
    );
    const query =
      state.query ||
      `from:cheryl@commercialtradesource.com subject:"Screening Information" has:attachment after:${after}`;
    const params = new URLSearchParams({ q: query, maxResults: "15" });
    if (state.next_page_token) params.set("pageToken", state.next_page_token);
    const list = await gmailGet(token, `messages?${params}`);
    for (const item of list.messages || []) {
      try {
        const exists = check(
          await admin
            .from("candidate_screenings")
            .select("id")
            .eq("source_message_id", item.id)
            .maybeSingle(),
        );
        if (exists) {
          duplicates++;
          continue;
        }
        const message = await gmailGet(
          token,
          `messages/${item.id}?format=full`,
        );
        const headers = Object.fromEntries(
          (message.payload?.headers || []).map(
            (h: { name: string; value: string }) => [
              h.name.toLowerCase(),
              h.value,
            ],
          ),
        );
        const parts = flatten(message.payload);
        const textPart = parts.find(
          (part) => part.mimeType === "text/plain" && part.body?.data,
        );
        if (!textPart)
          throw new Error(
            "No plain-text instructions; import this order manually.",
          );
        const text = new TextDecoder().decode(
          fromBase64Url(textPart.body!.data!),
        );
        const pdfs = parts.filter((part) =>
          /ePassport.*\.pdf$/i.test(part.filename || ""),
        );
        if (pdfs.length !== 1)
          throw new Error(
            "Expected one ePassport PDF; import this order manually.",
          );
        const pdf = pdfs[0];
        const fields = parseScreening({
          subject: headers.subject,
          text,
          to: headers.to,
          filename: pdf.filename,
        });
        if (!fields.confirmation_number)
          throw new Error("Missing confirmation number; import manually.");
        const filenameConfirmation = parseScreening({
          filename: pdf.filename,
        }).confirmation_number;
        if (
          !filenameConfirmation ||
          filenameConfirmation !== fields.confirmation_number
        )
          throw new Error(
            "PDF and email confirmation numbers differ; review manually.",
          );
        const duplicate = check(
          await admin
            .from("candidate_screenings")
            .select("id")
            .eq("confirmation_number", fields.confirmation_number)
            .maybeSingle(),
        );
        if (duplicate) {
          duplicates++;
          continue;
        }
        if ((pdf.body?.size || 0) > 10485760)
          throw new Error("PDF exceeds 10 MB.");
        const body = pdf.body?.attachmentId
          ? await gmailGet(
              token,
              `messages/${item.id}/attachments/${encodeURIComponent(pdf.body.attachmentId)}`,
            )
          : pdf.body;
        if (!body?.data) throw new Error("The PDF could not be read.");
        const bytes = fromBase64Url(body.data);
        const workers = check(
          await admin
            .from("workers")
            .select("id,name,email")
            .ilike(
              "email",
              fields.recipient_email
                .replaceAll("%", "\\%")
                .replaceAll("_", "\\_"),
            ),
        );
        const matched = matchCandidate(workers || [], fields.recipient_email);
        const id = crypto.randomUUID();
        const path = `${id}/order.pdf`;
        await uploadPdf(admin, path, bytes);
        const insertion = await admin.from("candidate_screenings").insert({
          ...fields,
          id,
          source: "gmail",
          source_message_id: item.id,
          source_subject: headers.subject || "",
          source_text: text,
          suggested_worker_id: matched?.id || null,
          received_at: new Date(Number(message.internalDate)).toISOString(),
          file_path: path,
          file_name: pdf.filename,
          file_size: bytes.length,
          file_sha256: await digest(bytes),
        });
        if (insertion.error) {
          await admin.storage.from(SCREENING_BUCKET).remove([path]);
          if (insertion.error.code === "23505") {
            duplicates++;
            continue;
          }
          throw insertion.error;
        }
        imported++;
      } catch (error) {
        // Message IDs are safe for troubleshooting. Never log document contents or OAuth tokens.
        errors.push(
          `${item.id}: ${error instanceof Error ? error.message : "Could not import order."}`,
        );
      }
    }
    // Failed pages are retried. Successfully imported messages on that page are deduplicated.
    const next = list.nextPageToken || null;
    check(
      await admin
        .from("screening_sync_state")
        .update(
          errors.length
            ? { query, next_page_token: state.next_page_token || null }
            : {
                query: next ? query : null,
                next_page_token: next,
                last_completed_at: next
                  ? state.last_completed_at
                  : now.toISOString(),
              },
        )
        .eq("id", true)
        .eq("lock_until", lease),
    );
    return { imported, duplicates, errors, hasMore: !!next && !errors.length };
  } finally {
    check(
      await admin
        .from("screening_sync_state")
        .update({ lock_until: "1970-01-01T00:00:00Z" })
        .eq("id", true)
        .eq("lock_until", lease),
    );
  }
}
