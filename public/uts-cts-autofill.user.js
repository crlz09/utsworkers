// ==UserScript==
// @name         UTS CTS Form Autofill
// @namespace    https://github.com/crlz09/utsworkers
// @version      1.1.0
// @description  Fill the CTS Avionté form from the selected UTS candidate.
// @match        https://hire.myavionte.com/app/careers/*
// @run-at       document-start
// @sandbox      DOM
// @grant        none
// ==/UserScript==

(() => {
  "use strict";

  const directRoute = "#/jobs/C49sQn8w92E/r6_4z5-tWGg/HuWz6tnkpSg/direct";
  const personalRoute = "#/job/HuWz6tnkpSg/personal/";
  const isPersonalStep = () => location.hash === personalRoute;
  if (
    window.parent === window || window.parent !== window.top ||
    location.pathname !== "/app/careers/" ||
    (location.hash !== directRoute && !isPersonalStep())
  ) return;

  const channel = "uts-cts-prefill-v1";
  const firstNameSelector = 'input[name*="_app_first_name_"]';
  const countrySelector = 'select[name*="_app_country_"]';
  const stateSelector = 'select[name*="_app_state_"]';
  const textSelectors = {
    first_name: firstNameSelector,
    last_name: 'input[name*="_app_last_name_"]',
    Address: "input#addr1",
    City: 'input[name*="_app_city_"]',
    ZipCode: 'input[name*="_app_zip_"]',
    mobile: 'input[name*="_app_mobilephone_"]',
    email: 'input[name*="_app_email_"]',
  };

  async function waitFor(find, timeout) {
    const end = Date.now() + timeout;
    do {
      const result = find();
      if (result) return result;
      await new Promise((resolve) => setTimeout(resolve, 100));
    } while (Date.now() < end);
    return null;
  }

  function writeField(field, value, eventType) {
    if (!field || field.disabled || field.readOnly || !field.getClientRects().length) return 0;
    field.value = value;
    field.dispatchEvent(new field.ownerDocument.defaultView.Event(eventType, { bubbles: true }));
    return 1;
  }

  function selectedLabel(select) {
    return select?.selectedOptions[0]?.textContent.trim().toLowerCase() || "";
  }

  function selectEmpty(select, label) {
    if (!select || selectedLabel(select) || !label) return 0;
    const option = Array.from(select.options).find(
      (item) => item.textContent.trim().toLowerCase() === label.toLowerCase()
    );
    return option && !option.disabled ? writeField(select, option.value, "change") : 0;
  }

  async function fill(values) {
    const firstName = await waitFor(() => {
      if (!isPersonalStep()) return null;
      const field = document.querySelector(firstNameSelector);
      return field?.getClientRects().length ? field : null;
    }, 6500);
    if (!firstName) return "unavailable";

    const country = document.querySelector(countrySelector);
    let changed = selectEmpty(country, values.Country);
    for (const [key, selector] of Object.entries(textSelectors)) {
      const field = document.querySelector(selector);
      if (values[key] && !field?.value.trim()) changed += writeField(field, values[key], "input");
    }

    if (values.state && values.Country && selectedLabel(country) === values.Country.toLowerCase()) {
      const state = await waitFor(() => {
        if (!isPersonalStep() || selectedLabel(country) !== values.Country.toLowerCase()) return null;
        const select = document.querySelector(stateSelector);
        return select?.options.length > 1 ? select : null;
      }, 3000);
      changed += selectEmpty(state, values.state);
    }
    return changed ? "filled" : "unchanged";
  }

  let pending;
  let filling = false;
  window.addEventListener("message", async (event) => {
    if (event.source !== window.parent || event.origin === "null") return;
    const { channel: received, requestId, type, values } = event.data || {};
    if (received !== channel || typeof requestId !== "string") return;
    const respond = (response) => event.source.postMessage({ channel, requestId, ...response }, event.origin);

    if (type === "probe" && !filling) {
      pending = { requestId, origin: event.origin, expiresAt: Date.now() + 3000 };
      respond({ type: "ready" });
      return;
    }
    if (
      type !== "fill" || pending?.requestId !== requestId || pending.origin !== event.origin ||
      Date.now() > pending.expiresAt || !values ||
      ![...Object.keys(textSelectors), "Country", "state"].every((key) => typeof values[key] === "string")
    ) return;

    pending = null;
    filling = true;
    try {
      respond({ type: "result", status: await fill(values) });
    } catch {
      respond({ type: "result", status: "unavailable" });
    } finally {
      filling = false;
    }
  });
})();
