function calculateExpression(value) {
  if (!value || !value.trim()) return null;

  try {
    const cleaned = value.replace(/\s+/g, "");

    if (!/^[0-9+\-*/().]+$/.test(cleaned)) {
      return null;
    }

    const result = Function(`"use strict"; return (${cleaned})`)();

    if (!Number.isFinite(result)) return null;

    return result;
  } catch {
    return null;
  }
}

function formatNumber(value) {
  if (value === null || !Number.isFinite(value)) return "—";
  return Number(value.toFixed(4)).toString();
}

function updateCalculator() {
  const demands = calculateExpression(document.getElementById("demands").value);
  const delivered = calculateExpression(document.getElementById("delivered").value);
  const totalDose = calculateExpression(document.getElementById("totalDose").value);

  // Demand delivery
  const deliveryFraction =
    demands !== null &&
    delivered !== null &&
    demands > 0
      ? delivered / demands
      : null;

  document.getElementById("deliveryFraction").textContent =
    deliveryFraction === null
      ? "—"
      : `${formatNumber(delivered)} / ${formatNumber(demands)}`;

  document.getElementById("deliveryPercent").textContent =
    deliveryFraction === null
      ? ""
      : `${(deliveryFraction * 100).toFixed(1)}%`;

  // Calculate all basal segments
  let totalBasal = 0;
  let hasBasalValues = false;

  document.querySelectorAll(".basal-segment").forEach((segment) => {
    const rateInput = segment.querySelector(".basal-rate");
    const hoursInput = segment.querySelector(".basal-hours");
    const doseOutput = segment.querySelector(".basal-segment-dose");
    const rateResult = segment.querySelector(".basal-rate-result");
    const hoursResult = segment.querySelector(".basal-hours-result");

    const rate = calculateExpression(rateInput.value);
    const hours = calculateExpression(hoursInput.value);

    rateResult.textContent =
      rate === null ? "" : `= ${formatNumber(rate)}`;

    hoursResult.textContent =
      hours === null ? "" : `= ${formatNumber(hours)}`;

    const segmentDose =
      rate !== null &&
      hours !== null &&
      rate >= 0 &&
      hours >= 0
        ? rate * hours
        : null;

    doseOutput.textContent =
      segmentDose === null ? "—" : formatNumber(segmentDose);

    if (segmentDose !== null) {
      totalBasal += segmentDose;
      hasBasalValues = true;
    }
  });

  const basalDose = hasBasalValues ? totalBasal : null;

  document.getElementById("basalDose").textContent =
    basalDose === null ? "—" : formatNumber(basalDose);

  // Bolus = total dose - total basal
  const bolusDose =
    totalDose !== null &&
    basalDose !== null
      ? totalDose - basalDose
      : null;

  document.getElementById("bolusDose").textContent =
    bolusDose === null ? "—" : formatNumber(bolusDose);

  // Percent distribution
  const basalPercent =
    totalDose !== null &&
    basalDose !== null &&
    totalDose > 0
      ? (basalDose / totalDose) * 100
      : null;

  const bolusPercent =
    totalDose !== null &&
    bolusDose !== null &&
    totalDose > 0
      ? (bolusDose / totalDose) * 100
      : null;

  document.getElementById("basalPercent").textContent =
    basalPercent === null
      ? "—"
      : `${basalPercent.toFixed(1)}%`;

  document.getElementById("bolusPercent").textContent =
    bolusPercent === null
      ? "—"
      : `${bolusPercent.toFixed(1)}%`;
}

function updateExpressionResults() {
  const pairs = [
    ["demands", "demandsResult"],
    ["delivered", "deliveredResult"],
    ["totalDose", "totalDoseResult"]
  ];

  pairs.forEach(([inputId, resultId]) => {
    const input = document.getElementById(inputId);
    const result = document.getElementById(resultId);
    const value = calculateExpression(input.value);

    result.textContent =
      value === null ? "" : `= ${formatNumber(value)}`;
  });
}

function attachInputListeners() {
  document.querySelectorAll("input").forEach((input) => {
    input.addEventListener("input", () => {
      updateExpressionResults();
      updateCalculator();
    });
  });
}

function addBasalSegment() {
  const container = document.getElementById("basalSegments");
  const count = container.querySelectorAll(".basal-segment").length + 1;

  const segment = document.createElement("div");
  segment.className = "basal-segment";

  segment.innerHTML = `
    <div class="segment-header">
      <strong>Basal segment ${count}</strong>
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

    document.querySelectorAll(".basal-segment").forEach((item, index) => {
      item.querySelector(".segment-header strong").textContent =
        `Basal segment ${index + 1}`;
    });

    updateCalculator();
  });

  updateCalculator();
}

document.getElementById("addBasalButton").addEventListener(
  "click",
  addBasalSegment
);

attachInputListeners();

document.getElementById("clearButton").addEventListener("click", () => {
  document.querySelectorAll("input").forEach((input) => {
    input.value = "";
  });

  document.querySelectorAll(".calculated").forEach((result) => {
    result.textContent = "";
  });

  const container = document.getElementById("basalSegments");

  while (container.querySelectorAll(".basal-segment").length > 1) {
    container.lastElementChild.remove();
  }

  updateCalculator();
});

document.getElementById("copyButton").addEventListener("click", async () => {
  const demands = calculateExpression(document.getElementById("demands").value);
  const delivered = calculateExpression(document.getElementById("delivered").value);
  const totalDose = calculateExpression(document.getElementById("totalDose").value);

  const deliveryFraction =
    demands !== null && delivered !== null && demands > 0
      ? delivered / demands
      : null;

  let totalBasal = 0;
  let hasBasalValues = false;

  document.querySelectorAll(".basal-segment").forEach((segment) => {
    const rate = calculateExpression(
      segment.querySelector(".basal-rate").value
    );

    const hours = calculateExpression(
      segment.querySelector(".basal-hours").value
    );

    if (
      rate !== null &&
      hours !== null &&
      rate >= 0 &&
      hours >= 0
    ) {
      totalBasal += rate * hours;
      hasBasalValues = true;
    }
  });

  const basalDose = hasBasalValues ? totalBasal : null;

  const bolusDose =
    totalDose !== null && basalDose !== null
      ? totalDose - basalDose
      : null;

  const basalPercent =
    totalDose !== null &&
    basalDose !== null &&
    totalDose > 0
      ? (basalDose / totalDose) * 100
      : null;

  const bolusPercent =
    totalDose !== null &&
    bolusDose !== null &&
    totalDose > 0
      ? (bolusDose / totalDose) * 100
      : null;

  const results = [
    `Demands: ${demands === null ? "—" : formatNumber(demands)}`,
    `Doses delivered: ${delivered === null ? "—" : formatNumber(delivered)}`,
    `Delivery: ${
      deliveryFraction === null
        ? "—"
        : `${formatNumber(delivered)}/${formatNumber(demands)} (${(deliveryFraction * 100).toFixed(1)}%)`
    }`,
    "",
    `Total basal: ${basalDose === null ? "—" : formatNumber(basalDose)} mg`,
    `Total dose: ${totalDose === null ? "—" : formatNumber(totalDose)} mg`,
    `Total bolus: ${bolusDose === null ? "—" : formatNumber(bolusDose)} mg`,
    `Basal: ${basalPercent === null ? "—" : basalPercent.toFixed(1)}%`,
    `Bolus: ${bolusPercent === null ? "—" : bolusPercent.toFixed(1)}%`
  ].join("\n");

  try {
    await navigator.clipboard.writeText(results);

    const button = document.getElementById("copyButton");
    button.textContent = "Copied!";

    setTimeout(() => {
      button.textContent = "Copy Results";
    }, 1500);
  } catch {
    alert("Unable to copy results. Please copy them manually.");
  }
});

updateCalculator();
