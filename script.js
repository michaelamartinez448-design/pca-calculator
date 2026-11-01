function calculateExpression(value) {
  if (!value || !value.trim()) return null;

  try {
    const cleaned = value.replace(/\s+/g, "");
    if (!/^[0-9+\-*/().]+$/.test(cleaned)) return null;

    const result = Function(`"use strict"; return (${cleaned})`)();
    return Number.isFinite(result) ? result : null;
  } catch {
    return null;
  }
}

function formatNumber(value) {
  if (value === null || !Number.isFinite(value)) return "—";
  return Number(value.toFixed(4)).toString();
}

function getIntervalData() {
  return [...document.querySelectorAll("#intervalHeaders th.interval-header")].map((header) => {
    const id = header.dataset.intervalId;
    const getValue = (field) =>
      document.querySelector(`[data-interval-id="${id}"][data-field="${field}"]`)?.value ?? "";

    return {
      drugInput: getValue("drug"),
      demandsInput: getValue("demands"),
      deliveredInput: getValue("delivered"),
      date: getValue("date"),
      time: getValue("time"),
      drug: calculateExpression(getValue("drug")),
      demands: calculateExpression(getValue("demands")),
      delivered: calculateExpression(getValue("delivered"))
    };
  });
}

function getBasalData() {
  return [...document.querySelectorAll(".basal-segment")].map((segment) => {
    const rateInput = segment.querySelector(".basal-rate").value;
    const hoursInput = segment.querySelector(".basal-hours").value;
    const rate = calculateExpression(rateInput);
    const hours = calculateExpression(hoursInput);

    return {
      rateInput,
      hoursInput,
      rate,
      hours,
      dose:
        rate !== null && hours !== null && rate >= 0 && hours >= 0
          ? rate * hours
          : null
    };
  });
}

function sumEnteredValues(values) {
  const entered = values.filter((value) => value !== null);
  return entered.length ? entered.reduce((sum, value) => sum + value, 0) : null;
}

function updateCalculator() {
  const intervals = getIntervalData();

  const demands = sumEnteredValues(intervals.map((item) => item.demands));
  const delivered = sumEnteredValues(intervals.map((item) => item.delivered));
  const totalDose = sumEnteredValues(intervals.map((item) => item.drug));

  const deliveryFraction =
    demands !== null && delivered !== null && demands > 0
      ? delivered / demands
      : null;

  document.getElementById("totalDemands").textContent = formatNumber(demands);
  document.getElementById("totalDelivered").textContent = formatNumber(delivered);

  document.getElementById("deliveryFraction").textContent =
    deliveryFraction === null
      ? "—"
      : `${formatNumber(delivered)} / ${formatNumber(demands)}`;

  document.getElementById("deliveryPercent").textContent =
    deliveryFraction === null ? "" : `${(deliveryFraction * 100).toFixed(1)}%`;

  const basalSegments = getBasalData();
  let totalBasal = 0;
  let hasBasal = false;

  document.querySelectorAll(".basal-segment").forEach((segment, index) => {
    const data = basalSegments[index];

    segment.querySelector(".basal-rate-result").textContent =
      data.rate === null ? "" : `= ${formatNumber(data.rate)}`;

    segment.querySelector(".basal-hours-result").textContent =
      data.hours === null ? "" : `= ${formatNumber(data.hours)}`;

    segment.querySelector(".basal-segment-dose").textContent =
      data.dose === null ? "—" : formatNumber(data.dose);

    if (data.dose !== null) {
      totalBasal += data.dose;
      hasBasal = true;
    }
  });

  const basalDose = hasBasal ? totalBasal : null;
  document.getElementById("basalDose").textContent = formatNumber(basalDose);
  document.getElementById("totalDose").textContent = formatNumber(totalDose);

  const bolusDose =
    totalDose !== null && basalDose !== null
      ? totalDose - basalDose
      : null;

  document.getElementById("bolusDose").textContent = formatNumber(bolusDose);

  const basalPercent =
    totalDose !== null && basalDose !== null && totalDose > 0
      ? (basalDose / totalDose) * 100
      : null;

  const bolusPercent =
    totalDose !== null && bolusDose !== null && totalDose > 0
      ? (bolusDose / totalDose) * 100
      : null;

  document.getElementById("basalPercent").textContent =
    basalPercent === null ? "—" : `${basalPercent.toFixed(1)}%`;

  document.getElementById("bolusPercent").textContent =
    bolusPercent === null ? "—" : `${bolusPercent.toFixed(1)}%`;
}

let nextIntervalId = 1;

function getLocalDateInputValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addInterval() {
  const id = nextIntervalId++;
  const number = document.querySelectorAll("#intervalHeaders th.interval-header").length + 1;

  const header = document.createElement("th");
  header.className = "interval-header";
  header.dataset.intervalId = id;
  header.innerHTML = `
    <div class="interval-heading">
      <strong>Interval ${number}</strong>
      <button type="button" class="remove-interval" aria-label="Remove interval ${number}">×</button>
    </div>
  `;
  document.getElementById("intervalHeaders").appendChild(header);

  const fields = [
    ["drug", "text", "e.g. 1+2+2"],
    ["demands", "text", "e.g. 7+7+4"],
    ["delivered", "text", "e.g. 5+6+3"],
    ["date", "date", ""],
    ["time", "text", "HH:MM"]
  ];

  fields.forEach(([field, type, placeholder]) => {
    const row = document.querySelector(`#intervalTable tbody tr[data-field="${field}"]`);
    const cell = document.createElement("td");
    const input = document.createElement("input");

    input.type = type;
    input.dataset.intervalId = id;
    input.dataset.field = field;
    if (field === "date") input.value = getLocalDateInputValue();

    if (placeholder) {
      input.placeholder = placeholder;
      input.inputMode = "decimal";
    }

    input.setAttribute("aria-label", `Interval ${number}: ${field}`);
    cell.appendChild(input);
    row.appendChild(cell);
  });

  header.querySelector(".remove-interval").addEventListener("click", () => {
    header.remove();

    document.querySelectorAll(`#intervalTable tbody tr`).forEach((row) => {
      row.querySelector(`[data-interval-id="${id}"]`)?.closest("td")?.remove();
    });

    renumberIntervals();
    updateCalculator();
  });

  renumberIntervals();
  updateCalculator();
}

function renumberIntervals() {
  document.querySelectorAll("#intervalHeaders th.interval-header").forEach((header, index) => {
    const number = index + 1;
    header.querySelector("strong").textContent = `Interval ${number}`;
    header.querySelector(".remove-interval").setAttribute(
      "aria-label",
      `Remove interval ${number}`
    );
  });
}

function addBasalSegment() {
  const container = document.getElementById("basalSegments");
  const number = container.querySelectorAll(".basal-segment").length + 1;

  const segment = document.createElement("div");
  segment.className = "basal-segment";
  segment.innerHTML = `
    <div class="segment-header">
      <strong>Basal segment ${number}</strong>
      <button type="button" class="remove-segment">Remove</button>
    </div>
    <div class="input-row">
      <div class="input-group">
        <label>Basal rate</label>
        <div class="unit-input">
          <input class="basal-rate" type="text" inputmode="decimal" placeholder="e.g. 0.5">
          <span>mg/hr</span>
        </div>
        <div class="calculated basal-rate-result"></div>
      </div>
      <div class="input-group">
        <label>Duration</label>
        <div class="unit-input">
          <input class="basal-hours" type="text" inputmode="decimal" placeholder="e.g. 6">
          <span>hr</span>
        </div>
        <div class="calculated basal-hours-result"></div>
      </div>
    </div>
    <div class="segment-dose">
      <span>Segment dose</span>
      <strong class="basal-segment-dose">—</strong>
      <small>mg</small>
    </div>
  `;

  container.appendChild(segment);
  segment.querySelectorAll("input").forEach((input) => {
    input.addEventListener("input", updateCalculator);
  });

  segment.querySelector(".remove-segment").addEventListener("click", () => {
    segment.remove();
    renumberBasalSegments();
    updateCalculator();
  });

  updateCalculator();
}

function renumberBasalSegments() {
  document.querySelectorAll(".basal-segment").forEach((segment, index) => {
    segment.querySelector(".segment-header strong").textContent =
      `Basal segment ${index + 1}`;
  });
}

function buildCopyText() {
  const intervals = getIntervalData();

  const demands = sumEnteredValues(intervals.map((item) => item.demands));
  const delivered = sumEnteredValues(intervals.map((item) => item.delivered));
  const totalDose = sumEnteredValues(intervals.map((item) => item.drug));

  const deliveryFraction =
    demands !== null && delivered !== null && demands > 0
      ? delivered / demands
      : null;

  const basalSegments = getBasalData();
  const totalBasal = sumEnteredValues(basalSegments.map((item) => item.dose));

  const bolusDose =
    totalDose !== null && totalBasal !== null
      ? totalDose - totalBasal
      : null;

  const basalPercent =
    totalDose !== null && totalBasal !== null && totalDose > 0
      ? (totalBasal / totalDose) * 100
      : null;

  const bolusPercent =
    totalDose !== null && bolusDose !== null && totalDose > 0
      ? (bolusDose / totalDose) * 100
      : null;

  return [
    `Demands: ${formatNumber(demands)}`,
    `Doses delivered: ${formatNumber(delivered)}`,
    `Delivery: ${
      deliveryFraction === null
        ? "—"
        : `${formatNumber(delivered)}/${formatNumber(demands)} (${(deliveryFraction * 100).toFixed(1)}%)`
    }`,
    `Total basal: ${formatNumber(totalBasal)} mg`,
    `Total dose: ${formatNumber(totalDose)} mg`,
    `Total bolus: ${formatNumber(bolusDose)} mg`,
    `Basal: ${basalPercent === null ? "—" : basalPercent.toFixed(1) + "%"}`,
    `Bolus: ${bolusPercent === null ? "—" : bolusPercent.toFixed(1) + "%"}`
  ].join("\n");
}

document.getElementById("addIntervalButton").addEventListener("click", addInterval);
document.getElementById("addBasalButton").addEventListener("click", addBasalSegment);
document.getElementById("basalSegments").addEventListener("input", updateCalculator);

document.getElementById("intervalTable").addEventListener("input", updateCalculator);



document.getElementById("intervalTable").addEventListener("input", (event) => {
  const input = event.target;
  if (input.dataset.field !== "time") return;

  const digits = input.value.replace(/\D/g, "").slice(0, 4);

  input.value = digits.length > 2
    ? `${digits.slice(0, 2)}:${digits.slice(2)}`
    : digits;

  input.setCustomValidity("");
  input.classList.remove("invalid-time");
});

document.getElementById("intervalTable").addEventListener("focusout", (event) => {
  const input = event.target;
  if (input.dataset.field !== "time" || !input.value) return;

  const valid = /^([01]\d|2[0-3]):[0-5]\d$/.test(input.value);

  if (!valid) {
    alert("Please enter a valid 24-hour time (00:00–23:59).");
    input.value = "";
  }
});

document.getElementById("clearButton").addEventListener("click", () => {
  document.querySelectorAll("#intervalHeaders th.interval-header").forEach((header) => {
    const id = header.dataset.intervalId;
    header.remove();

    document.querySelectorAll("#intervalTable tbody tr").forEach((row) => {
      row.querySelector(`[data-interval-id="${id}"]`)?.closest("td")?.remove();
    });
  });

  nextIntervalId = 1;
  addInterval();

  const basalContainer = document.getElementById("basalSegments");
  basalContainer.innerHTML = `
    <div class="basal-segment">
      <div class="segment-header">
        <strong>Basal segment 1</strong>
      </div>
      <div class="input-row">
        <div class="input-group">
          <label>Basal rate</label>
          <div class="unit-input">
            <input class="basal-rate" type="text" inputmode="decimal" placeholder="e.g. 0.5">
            <span>mg/hr</span>
          </div>
          <div class="calculated basal-rate-result"></div>
        </div>
        <div class="input-group">
          <label>Duration</label>
          <div class="unit-input">
            <input class="basal-hours" type="text" inputmode="decimal" placeholder="e.g. 6">
            <span>hr</span>
          </div>
          <div class="calculated basal-hours-result"></div>
        </div>
      </div>
      <div class="segment-dose">
        <span>Segment dose</span>
        <strong class="basal-segment-dose">—</strong>
        <small>mg</small>
      </div>
    </div>
  `;

  updateCalculator();
});

document.getElementById("copyButton").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(buildCopyText());
    const button = document.getElementById("copyButton");
    button.textContent = "Copied!";
    setTimeout(() => {
      button.textContent = "Copy Results";
    }, 1500);
  } catch {
    alert("Unable to copy results. Please copy them manually.");
  }
});

addInterval();
updateCalculator();
