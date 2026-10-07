import assert from "node:assert/strict";
import {
  adminClient,
  syncScreenings,
  toBase64,
} from "../functions/_shared/screening-server.ts";

Deno.test(
  "Gmail imports an original ePassport as an unverified suggestion and deduplicates resyncs",
  async () => {
    const oldFetch = globalThis.fetch;
    const keys = [
      "SUPABASE_URL",
      "SUPABASE_SERVICE_ROLE_KEY",
      "SCREENING_GOOGLE_CLIENT_ID",
      "SCREENING_GOOGLE_CLIENT_SECRET",
      "SCREENING_GOOGLE_REFRESH_TOKEN",
    ];
    const oldEnv = keys.map((key) => Deno.env.get(key));
    keys.forEach((key) =>
      Deno.env.set(
        key,
        key === "SUPABASE_URL"
          ? "https://screening-test.supabase.co"
          : "test-only",
      ),
    );
    let state: Record<string, unknown> = {
      id: true,
      query: null,
      next_page_token: null,
      last_completed_at: null,
      lock_until: "1970-01-01T00:00:00Z",
    };
    const orders: Record<string, unknown>[] = [];
    let mailbox = "cmolina@universaltalentsource.com",
      attachmentReads = 0;
    const worker = {
      id: "00000000-0000-4000-8000-000000000002",
      name: "Example Candidate",
      email: "candidate@example.com",
    };
    const text =
      "Your confirmation # is: AI123456789AB\n\nExample Lab\n123 Example Street\nCovington, GA 30014\nPhone: 555-0100\nTesting Hours - Mon-Fri 8am-5pm";
    const json = (body: unknown, status = 200) =>
      new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      });
    globalThis.fetch = async (input, init) => {
      const request = new Request(input, init),
        url = new URL(request.url);
      if (url.hostname === "oauth2.googleapis.com")
        return json({ access_token: "test-access" });
      if (url.hostname === "gmail.googleapis.com") {
        if (url.pathname.endsWith("/profile"))
          return json({ emailAddress: mailbox });
        if (url.pathname.endsWith("/messages")) {
          assert.ok(
            url.searchParams
              .get("q")
              ?.includes("from:cheryl@commercialtradesource.com"),
          );
          return json({ messages: [{ id: "original-test-message" }] });
        }
        if (url.pathname.includes("/attachments/")) {
          attachmentReads++;
          return json({
            data: toBase64(new TextEncoder().encode("%PDF-1.7\nexample")),
          });
        }
        return json({
          internalDate: String(Date.now()),
          payload: {
            headers: [
              {
                name: "Subject",
                value:
                  "Example Candidate - COMMERCIAL TRADE SOURCE-INDIANA Screening Information",
              },
              { name: "To", value: worker.email },
            ],
            parts: [
              {
                mimeType: "text/plain",
                body: { data: toBase64(new TextEncoder().encode(text)) },
              },
              {
                mimeType: "application/octet-stream",
                filename: "ePassport #AI123456789AB.pdf",
                body: { attachmentId: "test-attachment", size: 20 },
              },
            ],
          },
        });
      }
      if (url.pathname.endsWith("/screening_sync_state")) {
        const patch = await request.json();
        if (
          url.searchParams.has("lock_until") &&
          url.searchParams.get("lock_until")?.startsWith("lt.") &&
          new Date(String(state.lock_until)).getTime() >= Date.now()
        )
          return json(null);
        state = { ...state, ...patch };
        return json(url.searchParams.has("select") ? state : null);
      }
      if (url.pathname.endsWith("/candidate_screenings")) {
        if (request.method === "POST") {
          orders.push(await request.json());
          return json(null, 201);
        }
        const order = orders.find(
          (order) =>
            `eq.${order.source_message_id}` ===
              url.searchParams.get("source_message_id") ||
            `eq.${order.confirmation_number}` ===
              url.searchParams.get("confirmation_number"),
        );
        return json(order || null);
      }
      if (url.pathname.endsWith("/workers")) return json([worker]);
      if (url.pathname.startsWith("/storage/v1/object/"))
        return json({ Key: "test/order.pdf" });
      throw new Error(`Unexpected external request: ${url}`);
    };
    try {
      const first = await syncScreenings(adminClient());
      assert.equal(first.imported, 1);
      assert.deepEqual(first.errors, []);
      assert.equal(orders[0].suggested_worker_id, worker.id);
      assert.equal(orders[0].worker_id, undefined);
      assert.equal(orders[0].identity_verified_at, undefined);
      assert.equal(orders[0].send_state, undefined);
      assert.equal(orders[0].confirmation_number, "AI123456789AB");
      assert.ok(state.last_completed_at);
      const repeat = await syncScreenings(adminClient());
      assert.equal(repeat.duplicates, 1);
      assert.equal(repeat.imported, 0);
      assert.equal(attachmentReads, 1);
      mailbox = "other@example.com";
      await assert.rejects(
        () => syncScreenings(adminClient()),
        /Connect cmolina/,
      );
      assert.equal(state.lock_until, "1970-01-01T00:00:00Z");
      state.lock_until = new Date(Date.now() + 60000).toISOString();
      await assert.rejects(
        () => syncScreenings(adminClient()),
        /already running/,
      );
    } finally {
      globalThis.fetch = oldFetch;
      keys.forEach((key, i) =>
        oldEnv[i] === undefined
          ? Deno.env.delete(key)
          : Deno.env.set(key, oldEnv[i]!),
      );
    }
  },
);
