import assert from "node:assert/strict";
import { createScreeningHandler } from "../functions/screening-workflow/handler.ts";
import { digest } from "../functions/_shared/screening-server.ts";

// All HTTP calls are intercepted. No live database, Gmail, or candidate mail is touched.
Deno.test(
  "screening API verifies identity, guards edits, and safely retries exactly one saved email",
  async () => {
    const originalFetch = globalThis.fetch;
    const envKeys = [
      "SUPABASE_URL",
      "SUPABASE_SERVICE_ROLE_KEY",
      "RESEND_API_KEY",
      "SCREENING_EMAIL_FROM",
      "WORKER_NOTIFICATION_FROM",
      "SCREENING_SYNC_SECRET",
      "SCREENING_GOOGLE_CLIENT_ID",
      "SCREENING_GOOGLE_CLIENT_SECRET",
      "SCREENING_GOOGLE_REFRESH_TOKEN",
    ];
    const previous = envKeys.map((key) => Deno.env.get(key));
    Deno.env.set("SUPABASE_URL", "https://screening-test.supabase.co");
    Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "test-secret");
    Deno.env.set("RESEND_API_KEY", "test-resend");
    Deno.env.set("SCREENING_EMAIL_FROM", "UTS <screenings@example.com>");
    const worker = {
      id: "00000000-0000-4000-8000-000000000002",
      name: "Example Candidate",
      email: "candidate@example.com",
    };
    const pdf = new TextEncoder().encode("%PDF-1.7\nexample");
    let order: Record<string, unknown> = {
      id: "00000000-0000-4000-8000-000000000003",
      worker_id: null,
      identity_verified_at: null,
      candidate_name: worker.name,
      recipient_email: worker.email,
      confirmation_number: "AI123456789AB",
      lab_name: "Example Lab",
      lab_address: "123 Example Street",
      file_path: "order/order.pdf",
      file_name: "ePassport.pdf",
      file_sha256: await digest(pdf),
      send_state: "none",
      updated_at: "2026-10-07T12:00:00Z",
    };
    let allowed = true,
      validUser = true,
      failSend = false;
    let mailCalls = 0,
      acceptedSends = 0;
    const messages: unknown[] = [],
      keys: string[] = [];
    const json = (data: unknown, status = 200) =>
      new Response(JSON.stringify(data), {
        status,
        headers: { "Content-Type": "application/json" },
      });
    globalThis.fetch = async (input, init) => {
      const request = new Request(input, init),
        url = new URL(request.url);
      if (url.pathname === "/auth/v1/user")
        return validUser &&
          request.headers.get("Authorization") === "Bearer test-token"
          ? json({
              id: "00000000-0000-4000-8000-000000000001",
              email: "admin@example.com",
            })
          : json({ message: "invalid token" }, 401);
      if (url.pathname === "/rest/v1/admin_permissions")
        return json({ can_edit_workers: allowed, can_delete_workers: false });
      if (url.pathname === "/rest/v1/workers") return json(worker);
      if (url.pathname === "/rest/v1/candidate_screenings") {
        if (request.method === "GET") return json(order);
        if (request.method === "PATCH") {
          if (
            (url.searchParams.get("updated_at") &&
              url.searchParams.get("updated_at") !==
                `eq.${order.updated_at}`) ||
            (url.searchParams.get("send_state") &&
              url.searchParams.get("send_state") !== `eq.${order.send_state}`)
          )
            return json([]);
          order = {
            ...order,
            ...(await request.json()),
            updated_at: new Date().toISOString(),
          };
          return json(url.searchParams.has("select") ? order : null);
        }
      }
      if (url.pathname.startsWith("/storage/v1/object/"))
        return new Response(pdf, {
          headers: { "Content-Type": "application/pdf" },
        });
      if (url.hostname === "api.resend.com") {
        if (request.method === "GET")
          return json({
            id: "test-provider-message",
            to: [worker.email],
            subject: "Reviewed subject",
            text: "Reviewed body",
            created_at: new Date().toISOString(),
          });
        mailCalls++;
        keys.push(request.headers.get("Idempotency-Key")!);
        messages.push(await request.json());
        if (failSend) {
          failSend = false;
          acceptedSends++;
          throw new TypeError(
            "Network response lost after provider accepted email",
          );
        }
        if (!acceptedSends) acceptedSends++;
        return json({ id: "test-provider-message" });
      }
      throw new Error(`Unexpected external request: ${request.method} ${url}`);
    };
    const handler = createScreeningHandler();
    const action = async (
      body: Record<string, unknown>,
      token = "test-token",
    ) =>
      await handler(
        new Request("https://local/screening-workflow", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        }),
      );
    try {
      Deno.env.delete("SCREENING_EMAIL_FROM");
      Deno.env.set("WORKER_NOTIFICATION_FROM", "UTS <existing@example.com>");
      const config = await (await action({ action: "configuration" })).json();
      assert.equal(config.emailConfigured, true);
      assert.equal(config.sender, "UTS <existing@example.com>");
      Deno.env.set("SCREENING_EMAIL_FROM", "UTS <screenings@example.com>");
      const cronSecret = "test-cron-".repeat(8);
      Deno.env.set("SCREENING_SYNC_SECRET", cronSecret);
      [
        "SCREENING_GOOGLE_CLIENT_ID",
        "SCREENING_GOOGLE_CLIENT_SECRET",
        "SCREENING_GOOGLE_REFRESH_TOKEN",
      ].forEach((key) => Deno.env.delete(key));
      const skip = await action({ action: "sync" }, cronSecret);
      assert.equal(skip.status, 200);
      assert.equal((await skip.json()).reason, "gmail_not_configured");
      assert.equal((await action({ action: "send" }, cronSecret)).status, 401);
      validUser = false;
      assert.equal(
        (await action({ action: "send", id: order.id })).status,
        401,
      );
      validUser = true;
      allowed = false;
      assert.equal(
        (await action({ action: "send", id: order.id })).status,
        403,
      );
      allowed = true;
      assert.equal(
        (await action({ action: "send", id: order.id, reviewed: true })).status,
        400,
      );
      const save = {
        ...order,
        action: "save",
        version: order.updated_at,
        workerId: worker.id,
        identityConfirmed: true,
      };
      assert.equal(
        (await action({ ...save, recipient_email: "wrong@example.com" }))
          .status,
        400,
      );
      assert.equal(
        (await action({ ...save, identityConfirmed: false })).status,
        400,
      );
      assert.equal((await action(save)).status, 200);
      assert.equal(order.worker_id, worker.id);
      assert.equal(
        (
          await action({
            action: "send",
            id: order.id,
            version: order.updated_at,
            reviewed: false,
          })
        ).status,
        400,
      );
      assert.equal(
        (
          await action({
            action: "send",
            id: order.id,
            version: "stale",
            reviewed: true,
            subject: "Test",
            emailBody: "Test",
          })
        ).status,
        400,
      );
      assert.equal(mailCalls, 0);
      failSend = true;
      assert.equal(
        (
          await action({
            action: "send",
            id: order.id,
            version: order.updated_at,
            reviewed: true,
            subject: "Reviewed subject",
            emailBody: "Reviewed body",
            language: "es",
          })
        ).status,
        400,
      );
      assert.equal(order.send_state, "sending");
      assert.equal(
        (await action({ ...save, version: order.updated_at })).status,
        409,
      );
      assert.equal(
        (
          await action({
            action: "send",
            id: order.id,
            subject: "Changed subject",
            emailBody: "Changed body",
          })
        ).status,
        200,
      );
      assert.deepEqual(messages[0], messages[1]);
      assert.equal(keys[0], keys[1]);
      assert.equal(acceptedSends, 1);
      assert.equal(order.send_state, "sent");
      assert.equal(
        (await action({ action: "send", id: order.id })).status,
        200,
      );
      assert.equal(mailCalls, 2);
      order = {
        ...order,
        send_state: "sending",
        send_started_at: new Date(Date.now() - 24 * 3600000).toISOString(),
      };
      assert.equal(
        (await action({ action: "send", id: order.id })).status,
        409,
      );
      assert.equal(mailCalls, 2);
      assert.equal(
        (
          await action({
            action: "reconcile",
            id: order.id,
            version: order.updated_at,
            providerId: "wrong-message-id",
          })
        ).status,
        409,
      );
      order = { ...order, send_started_at: new Date().toISOString() };
      assert.equal(
        (
          await action({
            action: "reconcile",
            id: order.id,
            version: order.updated_at,
            providerId: "test-provider-message",
          })
        ).status,
        200,
      );
      assert.equal(order.send_state, "sent");
      assert.equal(mailCalls, 2);
      order = {
        ...order,
        send_state: "sending",
        send_started_at: new Date().toISOString(),
        file_sha256: "tampered",
      };
      assert.equal(
        (await action({ action: "send", id: order.id })).status,
        400,
      );
      assert.equal(mailCalls, 2);
      assert.equal(
        (
          await action({
            action: "attendance",
            id: order.id,
            version: order.updated_at,
            note: "Candidate confirmed by phone",
          })
        ).status,
        200,
      );
      assert.ok(order.attendance_reported_at);
      assert.equal(order.result_received_at, undefined);
      assert.equal(
        (
          await action({
            action: "result",
            id: order.id,
            version: order.updated_at,
            note: "Provider report",
          })
        ).status,
        400,
      );
    } finally {
      globalThis.fetch = originalFetch;
      envKeys.forEach((key, i) =>
        previous[i] === undefined
          ? Deno.env.delete(key)
          : Deno.env.set(key, previous[i]!),
      );
    }
  },
);
