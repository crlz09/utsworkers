import { getFullStateName, US_STATE_ABBREVIATIONS } from "./addressLookup.js";
import { splitName } from "./ctsJotform.js";

// Direct apply URL loaded by the CTS careers widget for this posting.
export const CTS_FORM_URL = "https://hire.myavionte.com/app/careers/#/jobs/C49sQn8w92E/r6_4z5-tWGg/HuWz6tnkpSg/direct";

function getCtsContactFields(candidate) {
  const { first, last } = splitName(candidate.name);
  const stateName = getFullStateName(candidate.state);
  const isUsAddress = Object.values(US_STATE_ABBREVIATIONS).some(
    (state) => state.toLowerCase() === stateName.toLowerCase()
  ) && /^\d{5}(-\d{4})?$/.test(String(candidate.zip_code ?? "").trim());
  return {
    first_name: first,
    last_name: last,
    Address: candidate.address,
    City: candidate.city,
    Country: candidate.country || (isUsAddress ? "United States of America" : ""),
    state: stateName,
    ZipCode: candidate.zip_code,
    mobile: candidate.phone,
    email: candidate.email,
  };
}

export function fillCtsAvionteForm(frame, candidate, signal) {
  const origin = new URL(CTS_FORM_URL).origin;
  const requestId = crypto.randomUUID();
  const channel = "uts-cts-prefill-v1";
  const values = Object.fromEntries(
    Object.entries(getCtsContactFields(candidate))
      .map(([name, value]) => [name, String(value ?? "").trim()])
  );
  const post = (type, payload = {}) => frame.postMessage({ channel, requestId, type, ...payload }, origin);

  return new Promise((resolve) => {
    let timeout;
    let connected = false;
    const finish = (status) => {
      window.clearTimeout(timeout);
      window.removeEventListener("message", onMessage);
      signal.removeEventListener("abort", onAbort);
      resolve(status);
    };
    const onAbort = () => finish("cancelled");
    const onMessage = (event) => {
      if (event.origin !== origin || event.source !== frame) return;
      const message = event.data;
      if (message?.channel !== channel || message.requestId !== requestId) return;
      if (message.type === "ready" && !connected) {
        connected = true;
        window.clearTimeout(timeout);
        timeout = window.setTimeout(() => finish("unavailable"), 12000);
        post("fill", { values });
      } else if (message.type === "result" && connected) {
        finish(["filled", "unchanged"].includes(message.status) ? message.status : "unavailable");
      }
    };

    if (signal.aborted) return onAbort();
    signal.addEventListener("abort", onAbort, { once: true });
    window.addEventListener("message", onMessage);
    timeout = window.setTimeout(() => finish("missing-script"), 1500);
    post("probe");
  });
}
