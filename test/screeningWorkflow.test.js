import test from "node:test";
import assert from "node:assert/strict";
import {
  buildScreeningEmail,
  emailHtml,
  matchCandidate,
  parseScreening,
  screeningStage,
  validateOrder,
  validatePdf,
  validateScreeningResult,
} from "../supabase/functions/_shared/screening.js";

const instructions = `Good afternoon,\nHere is the location for your pre-employment drug screen.\n\nYour confirmation # is: AI123456789AB\n\nExample Laboratory\n123 Example Street\nCovington, GA, 30014\nPhone: (678) 555-0100\n\nTesting Hours - Mon - Fri - 8am -5pm & Sat & Sun - 8am - 2pm\n\nIf you need to go to a different site or change your scheduled time, please contact Cheryl Hiser Benash at (317) 555-0100 with your request.`;
const order = parseScreening({
  subject:
    "FW: Example Candidate - COMMERCIAL TRADE SOURCE-INDIANA Screening Information",
  text: instructions,
  to: '"example@example.com" <example@example.com>',
  filename: "ePassport #AI123456789AB.pdf",
});

test("extracts the original screening fields without translating or inventing lab details", () => {
  assert.equal(order.candidate_name, "Example Candidate");
  assert.equal(order.recipient_email, "example@example.com");
  assert.equal(order.confirmation_number, "AI123456789AB");
  assert.equal(order.lab_name, "Example Laboratory");
  assert.equal(order.lab_address, "123 Example Street, Covington, GA, 30014");
  assert.equal(order.change_contact, "Cheryl Hiser Benash at (317) 555-0100");
  assert.equal(
    order.testing_hours,
    "Mon - Fri - 8am -5pm & Sat & Sun - 8am - 2pm",
  );
});
test("does not guess the recipient when there are multiple candidates", () => {
  assert.equal(
    parseScreening({ to: "first@example.com, second@example.com" })
      .recipient_email,
    "",
  );
  assert.equal(
    parseScreening({
      to: "cmolina@universaltalentsource.com, jerry@commercialtradesource.com",
    }).recipient_email,
    "",
  );
});
test("matches by exact normalized email and leaves duplicate or missing matches for review", () => {
  const workers = [{ id: "1", email: "Example@Example.com" }];
  assert.equal(matchCandidate(workers, " example@example.com ").id, "1");
  assert.equal(
    matchCandidate(
      [...workers, { id: "2", email: "example@example.com" }],
      "example@example.com",
    ),
    null,
  );
  assert.equal(matchCandidate(workers, "other@example.com"), null);
});
test("builds personalized Spanish and English messages with the original confirmation and print instruction", () => {
  for (const language of ["es", "en"]) {
    const message = buildScreeningEmail(
      order,
      { name: "Example Candidate", email: "example@example.com" },
      language,
    );
    assert.ok(message.body.includes(order.confirmation_number));
    assert.ok(message.body.includes(order.lab_address));
    assert.ok(message.body.includes(order.change_contact));
    assert.ok(
      message.body.includes(
        language === "es"
          ? "ePassport adjunto impreso"
          : "attached printed ePassport",
      ),
    );
    assert.ok(!message.body.includes("approved"));
  }
});
test("requires identity and complete lab instructions before sending", () => {
  assert.doesNotThrow(() => validateOrder(order));
  assert.throws(
    () => validateOrder({ ...order, lab_address: "" }),
    /lab address/,
  );
  assert.throws(
    () => validateOrder({ ...order, recipient_email: "wrong" }),
    /valid candidate email/,
  );
  assert.throws(
    () => validateOrder({ ...order, confirmation_number: "BAD/../../file" }),
    /confirmation number/,
  );
});
test("rejects non-PDF and oversized files", () => {
  assert.doesNotThrow(() =>
    validatePdf(new TextEncoder().encode("%PDF-1.7\nexample")),
  );
  assert.throws(
    () => validatePdf(new TextEncoder().encode("<html>")),
    /original PDF/,
  );
  assert.throws(() => validatePdf(new Uint8Array(10485761)), /10 MB/);
});
test("escapes source text in the outbound HTML rather than executing markup", () => {
  assert.ok(
    emailHtml('Hi <script>alert("x")</script> & goodbye').includes(
      "&lt;script&gt;",
    ),
  );
  assert.ok(!emailHtml("<script>x</script>").includes("<script>"));
});
test("attendance and result receipt are separate milestones from email delivery", () => {
  assert.equal(screeningStage({}), "received");
  assert.equal(screeningStage({ sent_at: "date" }), "sent");
  assert.equal(
    screeningStage({ attendance_reported_at: "date" }),
    "attendance_reported",
  );
  assert.equal(
    screeningStage({ result_received_at: "date" }),
    "result_received",
  );
});

test("result uploads recognize image signatures without weakening original ePassport validation", () => {
  const images = [
    [new Uint8Array([255, 216, 255, 224]), "image/jpeg", "jpg"],
    [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), "image/png", "png"],
    [new TextEncoder().encode("RIFFxxxxWEBP"), "image/webp", "webp"],
  ];
  for (const [bytes, contentType, extension] of images) {
    assert.deepEqual(validateScreeningResult(bytes), {
      contentType,
      extension,
    });
    assert.throws(() => validatePdf(bytes), /original PDF/);
  }
  assert.equal(
    validateScreeningResult(new TextEncoder().encode("%PDF-1.7")).contentType,
    "application/pdf",
  );
  assert.throws(
    () =>
      validateScreeningResult(
        new TextEncoder().encode('<svg onload="alert(1)">'),
      ),
    /must be/,
  );
  assert.throws(
    () => validateScreeningResult(new Uint8Array(10485761)),
    /10 MB/,
  );
  assert.throws(() => validateScreeningResult(new Uint8Array()), /10 MB/);
});
