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
  monthlyRevenue: document.querySelector("#monthlyRevenue"),
  revenueBonusPct: document.querySelector("#revenueBonusPct"),
  newBusinessGoal: document.querySelector("#newBusinessGoal"),
  newBusinessBonusPct: document.querySelector("#newBusinessBonusPct"),
  recurringGoal: document.querySelector("#recurringGoal"),
  recurringBonusPct: document.querySelector("#recurringBonusPct"),
};

const outputs = {
  totalCommission: document.querySelector("#totalCommission"),
  periodMonths: document.querySelector("#periodMonths"),
  effectiveRate: document.querySelector("#effectiveRate"),
  periodRevenue: document.querySelector("#periodRevenue"),
  revenueBonus: document.querySelector("#revenueBonus"),
  newBusinessBonus: document.querySelector("#newBusinessBonus"),
  recurringBonus: document.querySelector("#recurringBonus"),
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

const revenueOverrides = new Map();

function setupMonthControls() {
  monthNames.forEach((month, index) => {
    const optionStart = new Option(month, String(index));
    const optionEnd = new Option(month, String(index));
    inputs.startMonth.add(optionStart);
    inputs.endMonth.add(optionEnd);

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
  const value = Number.parseFloat(element.value);
  return Number.isFinite(value) ? Math.max(value, 0) : 0;
}

function getMonthRevenue(monthIndex, defaultRevenue) {
  return revenueOverrides.has(monthIndex)
    ? revenueOverrides.get(monthIndex)
    : defaultRevenue;
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
  const defaultRevenue = readNumber(inputs.monthlyRevenue);
  const revenueBonusPct = readNumber(inputs.revenueBonusPct) / 100;
  const newBusinessBonus =
    readNumber(inputs.newBusinessGoal) *
    (readNumber(inputs.newBusinessBonusPct) / 100);
  const recurringBonus =
    readNumber(inputs.recurringGoal) * (readNumber(inputs.recurringBonusPct) / 100);

  return monthIndexes.map((monthIndex) => {
    const revenue = getMonthRevenue(monthIndex, defaultRevenue);
    const revenueBonus = revenue * revenueBonusPct;

    return {
      monthIndex,
      revenue,
      revenueBonus,
      newBusinessBonus,
      recurringBonus,
      total: revenueBonus + newBusinessBonus + recurringBonus,
    };
  });
}

function sumMonthlyDetails(monthlyDetails) {
  return monthlyDetails.reduce(
    (totals, detail) => {
      totals.revenue += detail.revenue;
      totals.revenueBonus += detail.revenueBonus;
      totals.newBusinessBonus += detail.newBusinessBonus;
      totals.recurringBonus += detail.recurringBonus;
      totals.commission += detail.total;
      return totals;
    },
    {
      revenue: 0,
      revenueBonus: 0,
      newBusinessBonus: 0,
      recurringBonus: 0,
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
  outputs.revenueBonus.textContent = currencyFormatter.format(totals.revenueBonus);
  outputs.newBusinessBonus.textContent = currencyFormatter.format(
    totals.newBusinessBonus,
  );
  outputs.recurringBonus.textContent = currencyFormatter.format(
    totals.recurringBonus,
  );
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
      label: "Fat.",
      value: totals.revenueBonus,
      className: "revenue",
    },
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
  ];

  outputs.stackedBar.innerHTML = "";

  if (totals.commission <= 0) {
    const empty = document.createElement("div");
    empty.className = "bar-segment revenue";
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

function renderRows(monthIndexes, monthlyDetails, totals) {
  const rows = monthlyDetails
    .map((detail) => {
      return `
        <tr data-row-month="${detail.monthIndex}">
          <td>${monthNames[detail.monthIndex]}</td>
          <td class="editable-cell">
            <label class="table-money-input">
              <span>R$</span>
              <input
                class="monthly-revenue-input"
                type="number"
                min="0"
                step="0.01"
                data-month="${detail.monthIndex}"
                value="${formatInputNumber(detail.revenue)}"
                aria-label="Faturamento de ${monthNames[detail.monthIndex]}"
              />
            </label>
          </td>
          <td data-field="revenueBonus">${currencyFormatter.format(detail.revenueBonus)}</td>
          <td data-field="newBusinessBonus">${currencyFormatter.format(detail.newBusinessBonus)}</td>
          <td data-field="recurringBonus">${currencyFormatter.format(detail.recurringBonus)}</td>
          <td data-field="total">${currencyFormatter.format(detail.total)}</td>
        </tr>
      `;
    })
    .join("");

  const totalRow = `
    <tr class="total-row">
      <td>Total</td>
      <td data-total-field="revenue">${currencyFormatter.format(totals.revenue)}</td>
      <td data-total-field="revenueBonus">${currencyFormatter.format(totals.revenueBonus)}</td>
      <td data-total-field="newBusinessBonus">${currencyFormatter.format(totals.newBusinessBonus)}</td>
      <td data-total-field="recurringBonus">${currencyFormatter.format(totals.recurringBonus)}</td>
      <td data-total-field="commission">${currencyFormatter.format(totals.commission)}</td>
    </tr>
  `;

  outputs.monthlyRows.innerHTML =
    monthIndexes.length > 0
      ? `${rows}${totalRow}`
      : `<tr><td colspan="6">Selecione pelo menos um mês para calcular o período.</td></tr>`;
}

function updateRenderedRows(monthlyDetails, totals) {
  monthlyDetails.forEach((detail) => {
    const row = outputs.monthlyRows.querySelector(
      `[data-row-month="${detail.monthIndex}"]`,
    );

    if (!row) {
      return;
    }

    row.querySelector('[data-field="revenueBonus"]').textContent =
      currencyFormatter.format(detail.revenueBonus);
    row.querySelector('[data-field="newBusinessBonus"]').textContent =
      currencyFormatter.format(detail.newBusinessBonus);
    row.querySelector('[data-field="recurringBonus"]').textContent =
      currencyFormatter.format(detail.recurringBonus);
    row.querySelector('[data-field="total"]').textContent =
      currencyFormatter.format(detail.total);
  });

  const totalFields = {
    revenue: totals.revenue,
    revenueBonus: totals.revenueBonus,
    newBusinessBonus: totals.newBusinessBonus,
    recurringBonus: totals.recurringBonus,
    commission: totals.commission,
  };

  Object.entries(totalFields).forEach(([field, value]) => {
    const cell = outputs.monthlyRows.querySelector(`[data-total-field="${field}"]`);

    if (cell) {
      cell.textContent = currencyFormatter.format(value);
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
  const text = [
    "Resumo da simulação de comissão",
    `Período: ${makePeriodLabel(result.monthIndexes)}`,
    `Meses: ${result.monthIndexes.length}`,
    `Faturamento no período: ${currencyFormatter.format(result.totals.revenue)}`,
    `Bônus faturamento: ${currencyFormatter.format(result.totals.revenueBonus)}`,
    `Bônus novos negócios: ${currencyFormatter.format(result.totals.newBusinessBonus)}`,
    `Bônus recorrentes: ${currencyFormatter.format(result.totals.recurringBonus)}`,
    `Total de comissão: ${currencyFormatter.format(result.totals.commission)}`,
  ].join("\n");

  try {
    await navigator.clipboard.writeText(text);
    showToast("Resumo copiado.");
  } catch {
    showToast("Não foi possível copiar automaticamente.");
  }
}

function handleMonthlyRevenueEdit(event) {
  const input = event.target.closest(".monthly-revenue-input");

  if (!input) {
    return;
  }

  const monthIndex = Number.parseInt(input.dataset.month, 10);
  revenueOverrides.set(monthIndex, readNumber(input));
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
outputs.monthlyRows.addEventListener("input", handleMonthlyRevenueEdit);
document.querySelector("#copySummary").addEventListener("click", copySummary);
