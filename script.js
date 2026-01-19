(() => {
  "use strict";

  const STORAGE_KEY = "aprPayoffPlanner:v3";

  const form = document.getElementById("calcForm");
  const balanceEl = document.getElementById("balance");
  const promoExpiryEl = document.getElementById("promoExpiry");
  const payDayEl = document.getElementById("payDay");
  const startMonthEl = document.getElementById("startMonth");
  const extraPaymentEl = document.getElementById("extraPayment");
  const resetBtn = document.getElementById("resetBtn");

  const showScheduleEl = document.getElementById("showSchedule");
  const scheduleSectionEl = document.getElementById("scheduleSection");
  const scheduleBodyEl = document.getElementById("scheduleBody");

  const copyLinkBtn = document.getElementById("copyLinkBtn");
  const copyLinkStatus = document.getElementById("copyLinkStatus");

  const balanceErr = document.getElementById("balanceError");
  const promoErr = document.getElementById("promoExpiryError");
  const payDayErr = document.getElementById("payDayError");
  const startMonthErr = document.getElementById("startMonthError");
  const extraErr = document.getElementById("extraPaymentError");

  const resultsEl = document.getElementById("results");
  const monthlyPaymentOut = document.getElementById("monthlyPaymentOut");
  const totalMonthlyOut = document.getElementById("totalMonthlyOut");
  const extraLineOut = document.getElementById("extraLineOut");
  const numPaymentsOut = document.getElementById("numPaymentsOut");
  const finalMonthOut = document.getElementById("finalMonthOut");
  const finalDateOut = document.getElementById("finalDateOut");
  const scheduleOut = document.getElementById("scheduleOut");
  const noteOut = document.getElementById("noteOut");

  const currencyFmt = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
  });

  let lastScheduleRows = null;

  function parseMoneyToCents(value) {
    if (value === null || value === undefined) return null;
    const s = String(value).trim();
    if (!s) return null;

    const cleaned = s.replace(/,/g, "");
    if (!/^\d+(\.\d{0,2})?$/.test(cleaned)) return NaN;

    const [whole, frac = ""] = cleaned.split(".");
    const cents = Number(whole) * 100 + Number((frac + "00").slice(0, 2));
    return Number.isFinite(cents) ? cents : NaN;
  }

  function centsToDollars(cents) {
    return cents / 100;
  }

  function formatCents(cents) {
    return currencyFmt.format(centsToDollars(cents));
  }

  function ceilDiv(n, d) {
    return Math.floor((n + d - 1) / d);
  }


  function parseDateInput(value) {
    if (!value || typeof value !== "string") return null;
    const parts = value.split("-").map(Number);
    if (parts.length !== 3) return null;
    const [y, m, d] = parts;
    if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return null;
    const dt = new Date(y, m - 1, d);
    if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
    return dt;
  }

  function parseMonthInput(value) {
    if (!value || typeof value !== "string") return null;
    const parts = value.split("-").map(Number);
    if (parts.length !== 2) return null;
    const [y, m] = parts;
    if (!Number.isInteger(y) || !Number.isInteger(m)) return null;
    if (m < 1 || m > 12) return null;
    return { year: y, monthIndex: m - 1 };
  }

  function daysInMonth(year, monthIndex) {
    return new Date(year, monthIndex + 1, 0).getDate();
  }

  function paymentDateForMonth(year, monthIndex, desiredDay) {
    const dim = daysInMonth(year, monthIndex);
    const day = Math.min(desiredDay, dim);
    return new Date(year, monthIndex, day);
  }

  function addMonthsKeepingRule(date, monthsToAdd, desiredDay) {
    const y = date.getFullYear();
    const m = date.getMonth() + monthsToAdd;
    const target = new Date(y, m, 1);
    return paymentDateForMonth(target.getFullYear(), target.getMonth(), desiredDay);
  }

  function isBefore(a, b) {
    return a.getTime() < b.getTime();
  }

  function formatMonthYear(date) {
    return new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(date);
  }

  function formatFullDate(date) {
    return new Intl.DateTimeFormat(undefined, { month: "long", day: "numeric", year: "numeric" }).format(date);
  }

  function setFieldError(inputEl, errEl, msg) {
    if (msg) {
      errEl.textContent = msg;
      inputEl.setAttribute("aria-invalid", "true");
    } else {
      errEl.textContent = "";
      inputEl.removeAttribute("aria-invalid");
    }
  }

  function focusFirstInvalid() {
    const first = form.querySelector("[aria-invalid='true']");
    if (first && typeof first.focus === "function") first.focus();
  }

  function clearAllErrors() {
    setFieldError(balanceEl, balanceErr, "");
    setFieldError(promoExpiryEl, promoErr, "");
    setFieldError(payDayEl, payDayErr, "");
    setFieldError(startMonthEl, startMonthErr, "");
    setFieldError(extraPaymentEl, extraErr, "");
  }

  function showResults() {
    resultsEl.classList.add("show");
    resultsEl.setAttribute("aria-hidden", "false");
  }

  function hideResults() {
    resultsEl.classList.remove("show");
    resultsEl.style.display = "none";
    void resultsEl.offsetHeight;
    resultsEl.style.display = "";
    resultsEl.setAttribute("aria-hidden", "true");
    scheduleSectionEl.hidden = true;
    scheduleBodyEl.innerHTML = "";
    lastScheduleRows = null;
  }

  function findLastEligiblePayment(promoExpiry, desiredDay) {
    const candidate = paymentDateForMonth(
      promoExpiry.getFullYear(),
      promoExpiry.getMonth(),
      desiredDay
    );

    if (isBefore(candidate, promoExpiry)) return candidate;

    const prevMonthAnchor = new Date(promoExpiry.getFullYear(), promoExpiry.getMonth() - 1, 1);
    return paymentDateForMonth(prevMonthAnchor.getFullYear(), prevMonthAnchor.getMonth(), desiredDay);
  }

  function countPaymentsInclusive(firstPayment, lastPayment, desiredDay) {
    if (lastPayment.getTime() < firstPayment.getTime()) return 0;

    let count = 0;
    let current = new Date(firstPayment);

    for (let i = 0; i < 600; i++) {
      if (current.getTime() > lastPayment.getTime()) break;
      count++;
      current = addMonthsKeepingRule(current, 1, desiredDay);
    }
    return count;
  }

  function buildSchedule({ balanceCents, firstPayment, lastEligiblePayment, desiredDay, totalMonthlyCents }) {
    const rows = [];
    let remaining = balanceCents;
    let current = new Date(firstPayment);
    let idx = 1;

    for (let i = 0; i < 600; i++) {
      if (current.getTime() > lastEligiblePayment.getTime()) break;
      if (remaining <= 0) break;

      const paymentThisMonth = Math.min(totalMonthlyCents, remaining);
      remaining = Math.max(0, remaining - paymentThisMonth);

      rows.push({
        index: idx++,
        date: new Date(current),
        paymentCents: paymentThisMonth,
        remainingCents: remaining,
      });

      current = addMonthsKeepingRule(current, 1, desiredDay);
    }

    return rows;
  }

  function renderSchedule(rows) {
    scheduleBodyEl.innerHTML = "";
    const frag = document.createDocumentFragment();

    rows.forEach((row) => {
      const tr = document.createElement("tr");

      const tdIndex = document.createElement("td");
      tdIndex.textContent = String(row.index);

      const tdDate = document.createElement("td");
      tdDate.textContent = formatFullDate(row.date);

      const tdPay = document.createElement("td");
      tdPay.className = "right";
      tdPay.textContent = formatCents(row.paymentCents);

      const tdRem = document.createElement("td");
      tdRem.className = "right";
      tdRem.textContent = formatCents(row.remainingCents);

      tr.append(tdIndex, tdDate, tdPay, tdRem);
      frag.appendChild(tr);
    });

    scheduleBodyEl.appendChild(frag);
  }

  function updateScheduleVisibility() {
    const shouldShow = showScheduleEl.checked && resultsEl.classList.contains("show");
    scheduleSectionEl.hidden = !shouldShow;

    if (shouldShow) {
      if (Array.isArray(lastScheduleRows) && lastScheduleRows.length > 0) {
        renderSchedule(lastScheduleRows);
      } else {
        scheduleBodyEl.innerHTML = "";
      }
    }
  }

  // Shareable URL
  function buildShareParams({ balance, promoExpiry, payDay, startMonth, extraPayment, showSchedule }) {
    const p = new URLSearchParams();
    p.set("b", String(balance));
    p.set("e", promoExpiry);
    p.set("d", String(payDay));
    p.set("s", startMonth);
    const extra = (extraPayment ?? "").trim();
    if (extra && extra !== "0" && extra !== "0.00") p.set("x", extra);
    p.set("t", showSchedule ? "1" : "0");
    return p.toString();
  }

  function writeShareUrlToAddressBar(paramsString) {
    const url = new URL(window.location.href);
    url.search = paramsString ? `?${paramsString}` : "";
    window.history.replaceState({}, "", url.toString());
  }

  function readShareParamsFromUrl() {
    const p = new URLSearchParams(window.location.search);
    if (![...p.keys()].length) return null;

    const b = p.get("b");
    const e = p.get("e");
    const d = p.get("d");
    const s = p.get("s");
    const x = p.get("x");
    const t = p.get("t");

    if (!b || !e || !d || !s) return null;

    return {
      balance: b,
      promoExpiry: e,
      payDay: d,
      startMonth: s,
      extraPayment: x ?? "",
      showSchedule: t === "1",
    };
  }

  async function copyShareLink() {
    const url = window.location.href;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const ta = document.createElement("textarea");
        ta.value = url;
        ta.setAttribute("readonly", "");
        ta.style.position = "absolute";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      copyLinkStatus.textContent = "Copied share link to clipboard.";
    } catch {
      copyLinkStatus.textContent = "Could not copy. Select the address bar and copy the link manually.";
    }
  }

  function saveToStorage(payload) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
  
    }
  }

  function loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function applyStateToForm(state) {
    if (!state) return;
    if (typeof state.balance === "string") balanceEl.value = state.balance;
    if (typeof state.promoExpiry === "string") promoExpiryEl.value = state.promoExpiry;
    if (typeof state.payDay === "string") payDayEl.value = state.payDay;
    if (typeof state.startMonth === "string") startMonthEl.value = state.startMonth;
    if (typeof state.extraPayment === "string") extraPaymentEl.value = state.extraPayment;
    if (typeof state.showSchedule === "boolean") showScheduleEl.checked = state.showSchedule;
  }

  function getStateFromForm() {
    return {
      balance: balanceEl.value.trim(),
      promoExpiry: promoExpiryEl.value.trim(),
      payDay: payDayEl.value.trim(),
      startMonth: startMonthEl.value.trim(),
      extraPayment: extraPaymentEl.value.trim(),
      showSchedule: !!showScheduleEl.checked,
    };
  }

  function clearForm() {
    balanceEl.value = "";
    promoExpiryEl.value = "";
    payDayEl.value = "";
    startMonthEl.value = "";
    extraPaymentEl.value = "";
    showScheduleEl.checked = false;
  }

  function resetAll() {
    clearAllErrors();
    hideResults();
    clearForm();
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
    }
    writeShareUrlToAddressBar("");
    copyLinkStatus.textContent = "";
  }

  function validateInputs() {
    clearAllErrors();

    const balanceCents = parseMoneyToCents(balanceEl.value);
    const extraCentsRaw = parseMoneyToCents(extraPaymentEl.value);
    const extraCents = extraCentsRaw === null ? 0 : extraCentsRaw;

    const promoExpiry = parseDateInput(promoExpiryEl.value);
    const startMonth = parseMonthInput(startMonthEl.value);
    const payDay = Number(payDayEl.value);

    let ok = true;

    if (balanceCents === null || Number.isNaN(balanceCents) || balanceCents <= 0) {
      setFieldError(balanceEl, balanceErr, "Enter a valid balance greater than 0 (up to 2 decimals).");
      ok = false;
    }

    if (!promoExpiry) {
      setFieldError(promoExpiryEl, promoErr, "Choose a valid promo expiration date.");
      ok = false;
    }

    if (!Number.isInteger(payDay) || payDay < 1 || payDay > 31) {
      setFieldError(payDayEl, payDayErr, "Payment day must be a whole number from 1 to 31.");
      ok = false;
    }

    if (!startMonth) {
      setFieldError(startMonthEl, startMonthErr, "Choose a valid start month.");
      ok = false;
    }

    if (extraCentsRaw !== null && (Number.isNaN(extraCentsRaw) || extraCentsRaw < 0)) {
      setFieldError(extraPaymentEl, extraErr, "Extra payment must be 0 or a positive amount (up to 2 decimals).");
      ok = false;
    }

    if (!ok) {
      focusFirstInvalid();
      return { ok: false };
    }

    const firstPayment = paymentDateForMonth(startMonth.year, startMonth.monthIndex, payDay);
    const lastEligiblePayment = findLastEligiblePayment(promoExpiry, payDay);

    if (lastEligiblePayment.getTime() < firstPayment.getTime()) {
      setFieldError(
        startMonthEl,
        startMonthErr,
        "Start month is too late — there are no eligible payments before the promo expiration."
      );
      focusFirstInvalid();
      return { ok: false };
    }

    return {
      ok: true,
      balanceCents,
      extraCents,
      promoExpiry,
      payDay,
      startMonth,
      firstPayment,
      lastEligiblePayment,
    };
  }

  function calculateAndRender(valid) {
    const {
      balanceCents,
      extraCents,
      promoExpiry,
      payDay,
      firstPayment,
      lastEligiblePayment,
    } = valid;

    const numPaymentsWindow = countPaymentsInclusive(firstPayment, lastEligiblePayment, payDay);

    if (numPaymentsWindow <= 0) {
      setFieldError(startMonthEl, startMonthErr, "No eligible payments fit before the promo expiration.");
      focusFirstInvalid();
      hideResults();
      return;
    }

    const totalExtraOverWindow = extraCents * numPaymentsWindow;
    const remainingAfterExtra = Math.max(0, balanceCents - totalExtraOverWindow);

    const minRequiredCents = remainingAfterExtra === 0 ? 0 : ceilDiv(remainingAfterExtra, numPaymentsWindow);
    const totalMonthlyCents = minRequiredCents + extraCents;

    const rows = buildSchedule({
      balanceCents,
      firstPayment,
      lastEligiblePayment,
      desiredDay: payDay,
      totalMonthlyCents,
    });
    lastScheduleRows = rows;

    const payoffHappened = rows.length > 0 && rows[rows.length - 1].remainingCents === 0;
    const payoffDate = payoffHappened ? rows[rows.length - 1].date : lastEligiblePayment;

    monthlyPaymentOut.textContent = formatCents(minRequiredCents);
    totalMonthlyOut.textContent = formatCents(totalMonthlyCents);

    extraLineOut.textContent =
      extraCents > 0
        ? `Includes ${formatCents(extraCents)} extra per month.`
        : "No extra payment included.";

    numPaymentsOut.textContent = String(numPaymentsWindow);
    scheduleOut.textContent = `Eligible payment window: ${formatFullDate(firstPayment)} → ${formatFullDate(lastEligiblePayment)} (strictly before ${formatFullDate(promoExpiry)}).`;

    finalMonthOut.textContent = formatMonthYear(payoffDate);
    finalDateOut.textContent = payoffHappened
      ? `Estimated payoff date: ${formatFullDate(payoffDate)}`
      : `Not fully paid off by ${formatFullDate(lastEligiblePayment)} with this total monthly payment.`;

    const finishedEarly = payoffHappened && payoffDate.getTime() < lastEligiblePayment.getTime();
    const couldNotFinish = !payoffHappened;

    if (couldNotFinish) {
      noteOut.textContent =
        "Note: With the entered extra payment, the computed total monthly payment still didn't reach $0.00 by the last eligible payment date. Double-check inputs or increase the monthly payment.";
    } else if (minRequiredCents === 0 && extraCents > 0) {
      noteOut.textContent =
        "Note: Your extra payment alone is enough to pay off the balance within the eligible window. The required minimum payment (besides extra) is $0.00.";
    } else if (finishedEarly) {
      noteOut.textContent =
        "Note: With your extra payment, you may finish earlier than the last eligible payment date. The schedule stops once the remaining balance reaches $0.00.";
    } else {
      noteOut.textContent =
        "Assumes 0% APR for the entire period and equal monthly payments on the chosen day (with short months clamped to the last day).";
    }

    if (showScheduleEl.checked) {
      renderSchedule(rows);
    } else {
      scheduleBodyEl.innerHTML = "";
    }

    showResults();
    updateScheduleVisibility();

    const state = getStateFromForm();
    saveToStorage(state);

    const params = buildShareParams(state);
    writeShareUrlToAddressBar(params);
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const valid = validateInputs();
    if (!valid.ok) {
      hideResults();
      return;
    }
    calculateAndRender(valid);
  });

  resetBtn.addEventListener("click", resetAll);

  showScheduleEl.addEventListener("change", () => {
    updateScheduleVisibility();

    const state = getStateFromForm();
    saveToStorage(state);

    if (resultsEl.classList.contains("show")) {
      const params = buildShareParams(state);
      writeShareUrlToAddressBar(params);
    }
  });

  copyLinkBtn.addEventListener("click", copyShareLink);

  ["input", "change"].forEach((evt) => {
    form.addEventListener(evt, () => {
      const state = getStateFromForm();
      saveToStorage(state);
    });
  });

  // -------------------------
  // Init: URL params > localStorage
  // -------------------------
  const fromUrl = readShareParamsFromUrl();
  if (fromUrl) {
    applyStateToForm(fromUrl);
    saveToStorage(fromUrl);
  } else {
    const saved = loadFromStorage();
    if (saved) applyStateToForm(saved);
  }

  updateScheduleVisibility();
})();
