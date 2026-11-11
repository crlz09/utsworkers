// ==UserScript==
// @name         UTS CTS Form Autofill
// @namespace    https://github.com/crlz09/utsworkers
// @version      1.3.0
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
  const questionnaireRoute = "#/job/HuWz6tnkpSg/webtest/";
  const isPersonalStep = () => location.hash.startsWith(personalRoute);
  const isQuestionnaireStep = () => location.hash.startsWith(questionnaireRoute);
  if (
    window.parent === window || window.parent !== window.top ||
    location.pathname !== "/app/careers/" ||
    (location.hash !== directRoute && !isPersonalStep() && !isQuestionnaireStep())
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

  async function fillPersonal(values) {
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
    const ssn = document.querySelector('input[name*="_app_ssn_"]');
    if (/^[0-9]{4}$/.test(values.ssn_last4 || "") && ssn && !ssn.value.trim()) {
      changed += writeField(ssn, values.ssn_last4, "input");
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

  const normalizeLabel = (label) => label.replace(/\s+/g, " ").trim().toLowerCase();

  async function fillQuestionnaire(values) {
    const questions = await waitFor(() => {
      if (!isQuestionnaireStep()) return null;
      const fields = document.querySelectorAll(".question");
      return fields.length && document.querySelector(".question input, .question textarea") ? fields : null;
    }, 6500);
    if (!questions) return "unavailable";
    const answers = new Map(Object.entries(values.questionnaire || {}).map(
      ([label, value]) => [normalizeLabel(label), value]
    ));
    answers.set("service fee", "5");
    let changed = 0;
    for (const question of questions) {
      const label = question.querySelector('[ng-bind="question.question_text"]')?.textContent || "";
      const value = answers.get(normalizeLabel(label));
      if (typeof value !== "string" || !value.trim()) continue;
      const choices = Array.from(question.querySelectorAll('input[type="checkbox"], input[type="radio"]'));
      if (choices.length) {
        if (choices.some((choice) => choice.checked)) continue;
        const choice = choices.find((input) => normalizeLabel(input.value) === normalizeLabel(value));
        if (choice && !choice.disabled && choice.getClientRects().length) {
          choice.click();
          changed++;
        }
      } else {
        const field = question.querySelector('input:not([type="hidden"]), textarea');
        if (field && !field.value.trim()) changed += writeField(field, value, "input");
      }
    }
    return changed ? "filled" : "unchanged";
  }

  const fill = (values) => isQuestionnaireStep() ? fillQuestionnaire(values) : fillPersonal(values);
  let retainedValues;
  window.addEventListener("hashchange", () => {
    if (location.hash.startsWith("#/job/HuWz6tnkpSg/thankyou/")) retainedValues = null;
    if (retainedValues && (isPersonalStep() || isQuestionnaireStep())) {
      void fill(retainedValues).catch(() => {});
    }
  });

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
    retainedValues = values;
    try {
      respond({ type: "result", status: await fill(values) });
    } catch {
      respond({ type: "result", status: "unavailable" });
    } finally {
      filling = false;
    }
  });
})();
