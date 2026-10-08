import test from "node:test";
import assert from "node:assert/strict";
import {
  certificateCategory,
  certificateFields,
  uploadCertificate,
} from "../src/lib/onboardingCerts.js";
const file = { name: "client-course.pdf", type: "application/pdf", size: 1024 };

test("certificates retain custom names while keeping searchable categories", () => {
  assert.deepEqual(certificateFields("mewp", " Client MEWP course ", file), {
    document_name: "Client MEWP course",
    onboarding_cert_category: "mewp",
    document_type: "MEWP",
  });
  assert.equal(
    certificateFields("other", "Scaffold course", file).document_type,
    "Other: Scaffold course",
  );
  for (const type of [
    "osha",
    "OSHA Card",
    "OSHA Card - Front",
    "OSHA Card - Back",
  ])
    assert.equal(certificateCategory({ document_type: type }), "osha");
  assert.equal(
    certificateCategory({
      document_type: "Other: Lift",
      onboarding_cert_category: "other",
    }),
    "other",
  );
  assert.equal(
    certificateCategory({ document_type: "Other: Social Security Back" }),
    "",
  );
  assert.throws(() => certificateFields("mewp", "", file), /document name/);
  assert.throws(
    () =>
      certificateFields("other", "name", {
        ...file,
        type: "application/javascript",
      }),
    /Choose a PDF/,
  );
  assert.throws(
    () => certificateFields("mewp", "name", { ...file, size: 10485761 }),
    /10 MB/,
  );
});
function fixture({
  insertError = null,
  existing = null,
  checkError = null,
  uploadError = null,
} = {}) {
  const calls = { uploaded: [], removed: [], rows: [] };
  const storage = {
    upload: async (path, file) => {
      calls.uploaded.push({ path, file });
      return { error: uploadError };
    },
    remove: async (paths) => {
      calls.removed.push(...paths);
      return { error: null };
    },
  };
  const client = {
    storage: { from: () => storage },
    from: () => ({
      insert: async (row) => {
        calls.rows.push(row);
        return { error: insertError };
      },
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: existing, error: checkError }),
        }),
      }),
    }),
  };
  return { client, calls };
}
test("upload binds to the chosen candidate and appends rather than replacing", async () => {
  const { client, calls } = fixture();
  await uploadCertificate({
    client,
    workerId: "candidate-a",
    category: "mewp",
    name: "Client course",
    file,
  });
  assert.equal(calls.rows[0].worker_id, "candidate-a");
  assert.ok(calls.uploaded[0].path.startsWith("candidate-a/"));
  assert.equal(calls.rows[0].document_name, "Client course");
  assert.equal(calls.removed.length, 0);
  await assert.rejects(
    () =>
      uploadCertificate({
        client,
        workerId: "",
        category: "mewp",
        name: "name",
        file,
      }),
    /Select a candidate/,
  );
});
test("failed inserts clean up only files confirmed unlinked; uncertain success is retained", async () => {
  const error = new Error("Insert failed");
  const failed = fixture({ insertError: error });
  await assert.rejects(
    () =>
      uploadCertificate({
        ...failed,
        workerId: "candidate",
        category: "orientation",
        name: "Orientation",
        file,
      }),
    /Insert failed/,
  );
  assert.equal(failed.calls.removed.length, 1);
  const recovered = fixture({ insertError: error, existing: { id: "saved" } });
  assert.equal(
    await uploadCertificate({
      ...recovered,
      workerId: "candidate",
      category: "orientation",
      name: "Orientation",
      file,
    }),
    "saved",
  );
  assert.equal(recovered.calls.removed.length, 0);
  const uncertain = fixture({
    insertError: error,
    checkError: new Error("network"),
  });
  await assert.rejects(() =>
    uploadCertificate({
      ...uncertain,
      workerId: "candidate",
      category: "orientation",
      name: "Orientation",
      file,
    }),
  );
  assert.equal(uncertain.calls.removed.length, 0);
});
