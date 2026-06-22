const monthNames = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const inputs = {
  year: document.querySelector("#year"),
  periodMode: document.querySelector("#periodMode"),
  startMonth: document.querySelector("#startMonth"),
  endMonth: document.querySelector("#endMonth"),
  revenueGoal: document.querySelector("#revenueGoal"),
  newBusinessGoal: document.querySelector("#newBusinessGoal"),
  newBusinessBonusPct: document.querySelector("#newBusinessBonusPct"),
  recurringGoal: document.querySelector("#recurringGoal"),
  recurringBonusPct: document.querySelector("#recurringBonusPct"),
  exportGoal: document.querySelector("#exportGoal"),
  exportBonusPct: document.querySelector("#exportBonusPct"),
};

const outputs = {
  totalCommission: document.querySelector("#totalCommission"),
  periodMonths: document.querySelector("#periodMonths"),
  effectiveRate: document.querySelector("#effectiveRate"),
  periodRevenue: document.querySelector("#periodRevenue"),
  newBusinessBonus: document.querySelector("#newBusinessBonus"),
  recurringBonus: document.querySelector("#recurringBonus"),
  exportBonus: document.querySelector("#exportBonus"),
  periodLabel: document.querySelector("#periodLabel"),
  stackedBar: document.querySelector("#stackedBar"),
  monthlyRows: document.querySelector("#monthlyRows"),
  monthPicker: document.querySelector("#monthPicker"),
  toast: document.querySelector("#toast"),
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const percentFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const newSalesGoalOverrides = new Map();
const newSalesOverrides = new Map();
const newBusinessRevenueOverrides = new Map();
const recurringGoalOverrides = new Map();
const recurringRevenueOverrides = new Map();
const exportGoalOverrides = new Map();
const exportRevenueOverrides = new Map();

function setupMonthControls() {
  monthNames.forEach((month, index) => {
    inputs.startMonth.add(new Option(month, String(index)));
    inputs.endMonth.add(new Option(month, String(index)));

    const label = document.createElement("label");
    label.className = "month-toggle";
    label.innerHTML = `
      <input type="checkbox" name="customMonth" value="${index}" ${index < 3 ? "checked" : ""} />
      <span>${month.slice(0, 3)}</span>
    `;
    outputs.monthPicker.appendChild(label);
  });

  inputs.startMonth.value = "0";
  inputs.endMonth.value = "2";
}

function readNumber(element) {
  if (!element) {
    return 0;
  }

  const value = Number.parseFloat(element.value);
  return Number.isFinite(value) ? Math.max(value, 0) : 0;
}

function getMonthValue(overrides, monthIndex, defaultValue) {
  return overrides.has(monthIndex) ? overrides.get(monthIndex) : defaultValue;
}

function formatInputNumber(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function getSelectedMonths() {
  if (inputs.periodMode.value === "custom") {
    return Array.from(document.querySelectorAll('input[name="customMonth"]:checked'))
      .map((checkbox) => Number.parseInt(checkbox.value, 10))
      .sort((a, b) => a - b);
  }

  const start = Number.parseInt(inputs.startMonth.value, 10);
  const end = Number.parseInt(inputs.endMonth.value, 10);
  const first = Math.min(start, end);
  const last = Math.max(start, end);

  return monthNames
    .map((_, index) => index)
    .filter((index) => index >= first && index <= last);
}

function makePeriodLabel(monthIndexes) {
  const year = inputs.year.value || new Date().getFullYear();

  if (monthIndexes.length === 0) {
    return `Nenhum mês selecionado em ${year}`;
  }

  if (monthIndexes.length === 1) {
    return `${monthNames[monthIndexes[0]]} de ${year}`;
  }

  const isContinuous = monthIndexes.every((month, index) => {
    return index === 0 || month === monthIndexes[index - 1] + 1;
  });

  if (isContinuous) {
    return `${monthNames[monthIndexes[0]]} a ${
      monthNames[monthIndexes[monthIndexes.length - 1]]
    } de ${year}`;
  }

  return `${monthIndexes.length} meses selecionados em ${year}`;
}

function buildMonthlyDetails(monthIndexes) {
  const defaultNewSalesGoal = readNumber(inputs.newBusinessGoal);
  const revenueGoal = readNumber(inputs.revenueGoal);
  const defaultRecurringGoal = readNumber(inputs.recurringGoal);
  const defaultExportGoal = readNumber(inputs.exportGoal);
  const newBusinessBonusPct = readNumber(inputs.newBusinessBonusPct) / 100;
  const recurringBonusMultiplier = readNumber(inputs.recurringBonusPct) / 100;
  const exportBonusMultiplier = readNumber(inputs.exportBonusPct) / 100;

  return monthIndexes.map((monthIndex) => {
    const newSalesGoal = getMonthValue(
      newSalesGoalOverrides,
      monthIndex,
      defaultNewSalesGoal,
    );
    const newSales = getMonthValue(newSalesOverrides, monthIndex, newSalesGoal);
    const recurringGoal = getMonthValue(
      recurringGoalOverrides,
      monthIndex,
      defaultRecurringGoal,
    );
    const exportGoal = getMonthValue(
      exportGoalOverrides,
      monthIndex,
      defaultExportGoal,
    );
    const defaultNewBusinessRevenue = Math.max(
      revenueGoal - recurringGoal - exportGoal,
      0,
    );
    const newBusinessRevenue = getMonthValue(
      newBusinessRevenueOverrides,
      monthIndex,
      defaultNewBusinessRevenue,
    );
    const recurringRevenue = getMonthValue(
      recurringRevenueOverrides,
      monthIndex,
      recurringGoal,
    );
    const exportRevenue = getMonthValue(
      exportRevenueOverrides,
      monthIndex,
      exportGoal,
    );
    const revenue = newBusinessRevenue + recurringRevenue + exportRevenue;
    const recurringGoalRate =
      recurringGoal > 0 ? recurringRevenue / recurringGoal : 0;
    const exportGoalRate = exportGoal > 0 ? exportRevenue / exportGoal : 0;
    const newBusinessBonus = newBusinessRevenue * newBusinessBonusPct;
    const recurringBonusRate = recurringBonusMultiplier * recurringGoalRate;
    const recurringBonus = recurringRevenue * recurringBonusRate;
    const exportBonusRate = exportBonusMultiplier * exportGoalRate;
    const exportBonus = exportRevenue * exportBonusRate;

    return {
      monthIndex,
      newSalesGoal,
      newSales,
      newBusinessRevenue,
      recurringRevenue,
      recurringGoal,
      exportRevenue,
      exportGoal,
      revenue,
      recurringGoalRate,
      exportGoalRate,
      recurringBonusRate,
      exportBonusRate,
      newBusinessBonus,
      recurringBonus,
      exportBonus,
      total: newBusinessBonus + recurringBonus + exportBonus,
    };
  });
}

function sumMonthlyDetails(monthlyDetails) {
  return monthlyDetails.reduce(
    (totals, detail) => {
      totals.newSalesGoal += detail.newSalesGoal;
      totals.newSales += detail.newSales;
      totals.newBusinessRevenue += detail.newBusinessRevenue;
      totals.recurringRevenue += detail.recurringRevenue;
      totals.recurringGoal += detail.recurringGoal;
      totals.exportRevenue += detail.exportRevenue;
      totals.exportGoal += detail.exportGoal;
      totals.revenue += detail.revenue;
      totals.newBusinessBonus += detail.newBusinessBonus;
      totals.recurringBonus += detail.recurringBonus;
      totals.exportBonus += detail.exportBonus;
      totals.commission += detail.total;
      return totals;
    },
    {
      newSalesGoal: 0,
      newSales: 0,
      newBusinessRevenue: 0,
      recurringRevenue: 0,
      recurringGoal: 0,
      exportRevenue: 0,
      exportGoal: 0,
      revenue: 0,
      newBusinessBonus: 0,
      recurringBonus: 0,
      exportBonus: 0,
      commission: 0,
    },
  );
}

function calculate(options = {}) {
  const shouldRenderRows = options.renderRows !== false;
  const monthIndexes = getSelectedMonths();
  const monthlyDetails = buildMonthlyDetails(monthIndexes);
  const totals = sumMonthlyDetails(monthlyDetails);

  outputs.totalCommission.textContent = currencyFormatter.format(totals.commission);
  outputs.periodMonths.textContent = String(monthIndexes.length);
  outputs.effectiveRate.textContent =
    totals.revenue > 0
      ? `${percentFormatter.format((totals.commission / totals.revenue) * 100)}%`
      : "0,00%";
  outputs.periodRevenue.textContent = currencyFormatter.format(totals.revenue);
  outputs.newBusinessBonus.textContent = currencyFormatter.format(
    totals.newBusinessBonus,
  );
  outputs.recurringBonus.textContent = currencyFormatter.format(
    totals.recurringBonus,
  );
  outputs.exportBonus.textContent = currencyFormatter.format(totals.exportBonus);
  outputs.periodLabel.textContent = makePeriodLabel(monthIndexes);

  renderComposition(totals);

  if (shouldRenderRows) {
    renderRows(monthIndexes, monthlyDetails, totals);
  } else {
    updateRenderedRows(monthlyDetails, totals);
  }

  return {
    monthIndexes,
    monthlyDetails,
    totals,
  };
}

function renderComposition(totals) {
  const parts = [
    {
      label: "Novos",
      value: totals.newBusinessBonus,
      className: "new-business",
    },
    {
      label: "Rec.",
      value: totals.recurringBonus,
      className: "recurring",
    },
    {
      label: "Exp.",
      value: totals.exportBonus,
      className: "export",
    },
  ];

  outputs.stackedBar.innerHTML = "";

  if (totals.commission <= 0) {
    const empty = document.createElement("div");
    empty.className = "bar-segment new-business";
    empty.style.width = "100%";
    empty.textContent = "0%";
    outputs.stackedBar.appendChild(empty);
    return;
  }

  parts.forEach((part) => {
    const width = (part.value / totals.commission) * 100;
    const segment = document.createElement("div");
    segment.className = `bar-segment ${part.className}`;
    segment.style.width = `${width}%`;
    segment.textContent =
      width >= 12 ? `${part.label} ${percentFormatter.format(width)}%` : "";
    segment.title = `${part.label}: ${percentFormatter.format(width)}%`;
    outputs.stackedBar.appendChild(segment);
  });
}

function makeMoneyInput(className, monthIndex, value, label) {
  return `
    <label class="table-money-input">
      <span>R$</span>
      <input
        class="${className}"
        type="number"
        min="0"
        step="0.01"
        data-month="${monthIndex}"
        value="${formatInputNumber(value)}"
        aria-label="${label}"
      />
    </label>
  `;
}

function makeNumberInput(className, monthIndex, value, label) {
  return `
    <input
      class="table-number-input ${className}"
      type="number"
      min="0"
      step="1"
      data-month="${monthIndex}"
      value="${formatInputNumber(value)}"
      aria-label="${label}"
    />
  `;
}

function renderRows(monthIndexes, monthlyDetails, totals) {
  const rows = monthlyDetails
    .map((detail) => {
      return `
        <tr data-row-month="${detail.monthIndex}">
          <td>${monthNames[detail.monthIndex]}</td>
          <td class="editable-cell">
            ${makeNumberInput(
              "monthly-new-sales-goal-input",
              detail.monthIndex,
              detail.newSalesGoal,
              `Meta de vendas novas de ${monthNames[detail.monthIndex]}`,
            )}
          </td>
          <td class="editable-cell">
            ${makeNumberInput(
              "monthly-new-sales-input",
              detail.monthIndex,
              detail.newSales,
              `Vendas novas de ${monthNames[detail.monthIndex]}`,
            )}
          </td>
          <td class="editable-cell">
            ${makeMoneyInput(
              "monthly-new-business-revenue-input",
              detail.monthIndex,
              detail.newBusinessRevenue,
              `Valor de novos negócios de ${monthNames[detail.monthIndex]}`,
            )}
          </td>
          <td class="editable-cell">
            ${makeMoneyInput(
              "monthly-recurring-goal-input",
              detail.monthIndex,
              detail.recurringGoal,
              `Meta de recorrência de ${monthNames[detail.monthIndex]}`,
            )}
          </td>
          <td class="editable-cell">
            ${makeMoneyInput(
              "monthly-recurring-revenue-input",
              detail.monthIndex,
              detail.recurringRevenue,
              `Recorrência de ${monthNames[detail.monthIndex]}`,
            )}
          </td>
          <td class="editable-cell">
            ${makeMoneyInput(
              "monthly-export-goal-input",
              detail.monthIndex,
              detail.exportGoal,
              `Meta de exportação de ${monthNames[detail.monthIndex]}`,
            )}
          </td>
          <td class="editable-cell">
            ${makeMoneyInput(
              "monthly-export-revenue-input",
              detail.monthIndex,
              detail.exportRevenue,
              `Exportação de ${monthNames[detail.monthIndex]}`,
            )}
          </td>
          <td data-field="revenue">${currencyFormatter.format(detail.revenue)}</td>
          <td data-field="recurringGoalRate">
            <span class="status-pill neutral">
              ${percentFormatter.format(detail.recurringGoalRate * 100)}%
            </span>
          </td>
          <td data-field="exportGoalRate">
            <span class="status-pill export-neutral">
              ${percentFormatter.format(detail.exportGoalRate * 100)}%
            </span>
          </td>
          <td data-field="newBusinessBonus">${currencyFormatter.format(detail.newBusinessBonus)}</td>
          <td data-field="recurringBonus" title="Percentual aplicado: ${percentFormatter.format(detail.recurringBonusRate * 100)}%">${currencyFormatter.format(detail.recurringBonus)}</td>
          <td data-field="exportBonus" title="Percentual aplicado: ${percentFormatter.format(detail.exportBonusRate * 100)}%">${currencyFormatter.format(detail.exportBonus)}</td>
          <td data-field="total">${currencyFormatter.format(detail.total)}</td>
        </tr>
      `;
    })
    .join("");

  const totalRecurringGoalRate =
    totals.recurringGoal > 0 ? totals.recurringRevenue / totals.recurringGoal : 0;
  const totalExportGoalRate =
    totals.exportGoal > 0 ? totals.exportRevenue / totals.exportGoal : 0;

  const totalRow = `
    <tr class="total-row">
      <td>Total</td>
      <td data-total-field="newSalesGoal">${formatInputNumber(totals.newSalesGoal)}</td>
      <td data-total-field="newSales">${formatInputNumber(totals.newSales)}</td>
      <td data-total-field="newBusinessRevenue">${currencyFormatter.format(totals.newBusinessRevenue)}</td>
      <td data-total-field="recurringGoal">${currencyFormatter.format(totals.recurringGoal)}</td>
      <td data-total-field="recurringRevenue">${currencyFormatter.format(totals.recurringRevenue)}</td>
      <td data-total-field="exportGoal">${currencyFormatter.format(totals.exportGoal)}</td>
      <td data-total-field="exportRevenue">${currencyFormatter.format(totals.exportRevenue)}</td>
      <td data-total-field="revenue">${currencyFormatter.format(totals.revenue)}</td>
      <td data-total-field="recurringGoalRate">${percentFormatter.format(totalRecurringGoalRate * 100)}%</td>
      <td data-total-field="exportGoalRate">${percentFormatter.format(totalExportGoalRate * 100)}%</td>
      <td data-total-field="newBusinessBonus">${currencyFormatter.format(totals.newBusinessBonus)}</td>
      <td data-total-field="recurringBonus">${currencyFormatter.format(totals.recurringBonus)}</td>
      <td data-total-field="exportBonus">${currencyFormatter.format(totals.exportBonus)}</td>
      <td data-total-field="commission">${currencyFormatter.format(totals.commission)}</td>
    </tr>
  `;

  outputs.monthlyRows.innerHTML =
    monthIndexes.length > 0
      ? `${rows}${totalRow}`
      : `<tr><td colspan="15">Selecione pelo menos um mês para calcular o período.</td></tr>`;
}

function updateRenderedRows(monthlyDetails, totals) {
  monthlyDetails.forEach((detail) => {
    const row = outputs.monthlyRows.querySelector(
      `[data-row-month="${detail.monthIndex}"]`,
    );

    if (!row) {
      return;
    }

    const recurringGoalRateCell = row.querySelector(
      '[data-field="recurringGoalRate"]',
    );
    const exportGoalRateCell = row.querySelector('[data-field="exportGoalRate"]');
    const newSalesInput = row.querySelector(".monthly-new-sales-input");
    const newBusinessRevenueInput = row.querySelector(
      ".monthly-new-business-revenue-input",
    );
    const recurringRevenueInput = row.querySelector(".monthly-recurring-revenue-input");
    const exportRevenueInput = row.querySelector(".monthly-export-revenue-input");

    if (newSalesInput && !newSalesOverrides.has(detail.monthIndex)) {
      newSalesInput.value = formatInputNumber(detail.newSales);
    }

    if (
      newBusinessRevenueInput &&
      !newBusinessRevenueOverrides.has(detail.monthIndex)
    ) {
      newBusinessRevenueInput.value = formatInputNumber(detail.newBusinessRevenue);
    }

    if (recurringRevenueInput && !recurringRevenueOverrides.has(detail.monthIndex)) {
      recurringRevenueInput.value = formatInputNumber(detail.recurringRevenue);
    }

    if (exportRevenueInput && !exportRevenueOverrides.has(detail.monthIndex)) {
      exportRevenueInput.value = formatInputNumber(detail.exportRevenue);
    }

    row.querySelector('[data-field="revenue"]').textContent =
      currencyFormatter.format(detail.revenue);
    recurringGoalRateCell.innerHTML = `
      <span class="status-pill neutral">
        ${percentFormatter.format(detail.recurringGoalRate * 100)}%
      </span>
    `;
    exportGoalRateCell.innerHTML = `
      <span class="status-pill export-neutral">
        ${percentFormatter.format(detail.exportGoalRate * 100)}%
      </span>
    `;
    row.querySelector('[data-field="newBusinessBonus"]').textContent =
      currencyFormatter.format(detail.newBusinessBonus);
    row.querySelector('[data-field="recurringBonus"]').textContent =
      currencyFormatter.format(detail.recurringBonus);
    row.querySelector('[data-field="recurringBonus"]').title =
      `Percentual aplicado: ${percentFormatter.format(detail.recurringBonusRate * 100)}%`;
    row.querySelector('[data-field="exportBonus"]').textContent =
      currencyFormatter.format(detail.exportBonus);
    row.querySelector('[data-field="exportBonus"]').title =
      `Percentual aplicado: ${percentFormatter.format(detail.exportBonusRate * 100)}%`;
    row.querySelector('[data-field="total"]').textContent =
      currencyFormatter.format(detail.total);
  });

  const totalRecurringGoalRate =
    totals.recurringGoal > 0 ? totals.recurringRevenue / totals.recurringGoal : 0;
  const totalExportGoalRate =
    totals.exportGoal > 0 ? totals.exportRevenue / totals.exportGoal : 0;
  const totalFields = {
    newSalesGoal: formatInputNumber(totals.newSalesGoal),
    newSales: formatInputNumber(totals.newSales),
    newBusinessRevenue: currencyFormatter.format(totals.newBusinessRevenue),
    recurringGoal: currencyFormatter.format(totals.recurringGoal),
    recurringRevenue: currencyFormatter.format(totals.recurringRevenue),
    exportGoal: currencyFormatter.format(totals.exportGoal),
    exportRevenue: currencyFormatter.format(totals.exportRevenue),
    revenue: currencyFormatter.format(totals.revenue),
    recurringGoalRate: `${percentFormatter.format(totalRecurringGoalRate * 100)}%`,
    exportGoalRate: `${percentFormatter.format(totalExportGoalRate * 100)}%`,
    newBusinessBonus: currencyFormatter.format(totals.newBusinessBonus),
    recurringBonus: currencyFormatter.format(totals.recurringBonus),
    exportBonus: currencyFormatter.format(totals.exportBonus),
    commission: currencyFormatter.format(totals.commission),
  };

  Object.entries(totalFields).forEach(([field, value]) => {
    const cell = outputs.monthlyRows.querySelector(`[data-total-field="${field}"]`);

    if (cell) {
      cell.textContent = value;
    }
  });
}

function togglePeriodMode() {
  const isCustom = inputs.periodMode.value === "custom";
  document.querySelectorAll(".range-only").forEach((element) => {
    element.style.display = isCustom ? "none" : "grid";
  });
  outputs.monthPicker.classList.toggle("is-visible", isCustom);
}

function showToast(message) {
  outputs.toast.textContent = message;
  outputs.toast.classList.add("is-visible");

  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => {
    outputs.toast.classList.remove("is-visible");
  }, 2200);
}

async function copySummary() {
  const result = calculate();
  const totalRecurringGoalRate =
    result.totals.recurringGoal > 0
      ? result.totals.recurringRevenue / result.totals.recurringGoal
      : 0;
  const totalExportGoalRate =
    result.totals.exportGoal > 0
      ? result.totals.exportRevenue / result.totals.exportGoal
      : 0;
  const text = [
    "Resumo da simulação de comissão",
    `Período: ${makePeriodLabel(result.monthIndexes)}`,
    `Meses: ${result.monthIndexes.length}`,
    `Meta de vendas novas: ${formatInputNumber(result.totals.newSalesGoal)}`,
    `Vendas novas: ${formatInputNumber(result.totals.newSales)}`,
    `Valor de novos negócios: ${currencyFormatter.format(result.totals.newBusinessRevenue)}`,
    `Meta de recorrência: ${currencyFormatter.format(result.totals.recurringGoal)}`,
    `Recorrência: ${currencyFormatter.format(result.totals.recurringRevenue)}`,
    `Atingimento da meta de recorrência: ${percentFormatter.format(totalRecurringGoalRate * 100)}%`,
    `Meta de exportação: ${currencyFormatter.format(result.totals.exportGoal)}`,
    `Exportação: ${currencyFormatter.format(result.totals.exportRevenue)}`,
    `Atingimento da meta de exportação: ${percentFormatter.format(totalExportGoalRate * 100)}%`,
    `Faturamento no período: ${currencyFormatter.format(result.totals.revenue)}`,
    `Bônus novos negócios: ${currencyFormatter.format(result.totals.newBusinessBonus)}`,
    `Bônus recorrentes: ${currencyFormatter.format(result.totals.recurringBonus)}`,
    `Bônus exportação: ${currencyFormatter.format(result.totals.exportBonus)}`,
    `Total de comissão: ${currencyFormatter.format(result.totals.commission)}`,
  ].join("\n");

  try {
    await navigator.clipboard.writeText(text);
    showToast("Resumo copiado.");
  } catch {
    showToast("Não foi possível copiar automaticamente.");
  }
}

function handleMonthlyEdit(event) {
  const input = event.target.closest(
    ".monthly-new-sales-goal-input, .monthly-new-sales-input, .monthly-new-business-revenue-input, .monthly-recurring-goal-input, .monthly-recurring-revenue-input, .monthly-export-goal-input, .monthly-export-revenue-input",
  );

  if (!input) {
    return;
  }

  const monthIndex = Number.parseInt(input.dataset.month, 10);

  if (input.classList.contains("monthly-new-sales-goal-input")) {
    newSalesGoalOverrides.set(monthIndex, readNumber(input));
  }

  if (input.classList.contains("monthly-new-sales-input")) {
    newSalesOverrides.set(monthIndex, readNumber(input));
  }

  if (input.classList.contains("monthly-new-business-revenue-input")) {
    newBusinessRevenueOverrides.set(monthIndex, readNumber(input));
  }

  if (input.classList.contains("monthly-recurring-goal-input")) {
    recurringGoalOverrides.set(monthIndex, readNumber(input));
  }

  if (input.classList.contains("monthly-recurring-revenue-input")) {
    recurringRevenueOverrides.set(monthIndex, readNumber(input));
  }

  if (input.classList.contains("monthly-export-goal-input")) {
    exportGoalOverrides.set(monthIndex, readNumber(input));
  }

  if (input.classList.contains("monthly-export-revenue-input")) {
    exportRevenueOverrides.set(monthIndex, readNumber(input));
  }

  calculate({ renderRows: false });
}

setupMonthControls();
togglePeriodMode();
calculate();

document.querySelector("#simulatorForm").addEventListener("input", calculate);
document.querySelector("#simulatorForm").addEventListener("change", () => {
  togglePeriodMode();
  calculate();
});
outputs.monthlyRows.addEventListener("input", handleMonthlyEdit);
document.querySelector("#copySummary").addEventListener("click", copySummary);
