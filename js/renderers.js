/**
 * UI Renderers Module
 */
import { store, getMonday, saveProcurementCosts } from './state.js';

let barChart = null;
let pieChart = null;

function getCategoryStyle(catName) {
  const upper = catName.toUpperCase();
  if (!store.categoryColorMap[upper]) {
    const keys = Object.keys(store.categoryColorMap);
    const paletteIndex = keys.length % store.colorPalette.length;
    store.categoryColorMap[upper] = store.colorPalette[paletteIndex];
  }
  return store.categoryColorMap[upper];
}

export function renderProcurementSettings(onUpdateCallback) {
  const container = document.getElementById('procurementList');
  if (!container) return;

  container.innerHTML = Object.keys(store.procurementCosts).map(cat => `
    <div class="flex items-center justify-between bg-brandDark/40 p-2 rounded border border-brandBorder">
      <span class="font-bold text-xs font-mono text-neonBlue">${cat}</span>
      <div class="flex items-center gap-2">
        <input type="number" value="${store.procurementCosts[cat]}" data-cat="${cat}" class="input-procurement-cost w-20 bg-brandCard text-right text-xs p-1 rounded border border-brandBorder text-white font-mono" />
        <span class="text-[10px] text-gray-400">€/100г</span>
        <button data-cat="${cat}" class="btn-delete-procurement text-red-400 font-bold px-1 hover:text-red-300">×</button>
      </div>
    </div>
  `).join('');

  container.querySelectorAll('.input-procurement-cost').forEach(input => {
    input.addEventListener('change', (e) => {
      const cat = e.target.getAttribute('data-cat');
      store.procurementCosts[cat] = parseFloat(e.target.value) || 0;
      saveProcurementCosts();
      onUpdateCallback();
    });
  });

  container.querySelectorAll('.btn-delete-procurement').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const cat = e.target.getAttribute('data-cat');
      delete store.procurementCosts[cat];
      saveProcurementCosts();
      renderProcurementSettings(onUpdateCallback);
      onUpdateCallback();
    });
  });
}

export function renderMyExpensesUI(combinedExpenses, total, onRemoveCallback) {
  document.getElementById('myTotalDisplay').innerText = `${total.toFixed(2)} €`;
  const container = document.getElementById('myExpensesList');
  if (combinedExpenses.length === 0) {
    container.innerHTML = '<p class="text-gray-500 text-[11px]">Записи відсутні</p>';
    return;
  }
  container.innerHTML = combinedExpenses.slice().reverse().map(item => `
    <div class="flex justify-between items-center bg-brandDark/60 p-1.5 rounded-lg border ${item.isAuto ? (item.isBonus ? 'border-amber-500/40' : 'border-neonBlue/40') : 'border-brandBorder'}">
      <div class="truncate pr-2">
        <span class="text-gray-300">${item.note}</span>
        <span class="text-[9px] text-gray-500 block">${item.time} ${item.isAuto ? `<span class="${item.isBonus ? 'text-amber-400' : 'text-neonBlue'}">(${item.isBonus ? 'Інфо Бонус' : 'Auto Карта'})</span>` : ''}</span>
      </div>
      <div class="flex items-center gap-1.5 shrink-0">
        <span class="font-bold ${item.amount >= 0 ? 'text-emerald-400' : 'text-red-400'}">${item.amount >= 0 ? '+' : ''}${item.amount} €</span>
        ${!item.isAuto ? `<button data-expense-id="${item.id}" class="btn-remove-expense text-gray-500 hover:text-red-400 font-bold px-1">×</button>` : ''}
      </div>
    </div>
  `).join('');

  container.querySelectorAll('.btn-remove-expense').forEach(btn => {
    btn.addEventListener('click', (e) => onRemoveCallback(parseInt(e.target.getAttribute('data-expense-id'), 10)));
  });
}

export function renderCategoryCards(categories) {
  const container = document.getElementById('categorySummaryCards');
  container.innerHTML = Object.keys(categories).map(catName => {
    const cat = categories[catName];
    const style = getCategoryStyle(catName);
    return `
      <div class="bg-brandCard/90 p-4 rounded-2xl border" style="border-color: ${style.border}40;">
        <div class="flex justify-between items-center mb-3">
          <span class="px-2 py-0.5 rounded text-xs font-bold font-mono" style="background: ${style.bg}; color: ${style.text}; border: 1px solid ${style.border}60;">
            ${catName}
          </span>
          <span class="text-xs text-gray-400 font-mono">${cat.deals} угод</span>
        </div>
        <div class="grid grid-cols-2 gap-2 text-xs">
          <div><p class="text-[10px] text-gray-400">Отримано (Факт)</p><p class="font-bold text-white">${cat.eurPaid.toFixed(2)} €</p></div>
          <div><p class="text-[10px] text-gray-400">Чистий прибуток</p><p class="font-bold text-neonGreen">${cat.netProfit.toFixed(2)} €</p></div>
          <div><p class="text-[10px] text-gray-400">Точна вага</p><p class="font-bold text-gray-200">${cat.exactGramm.toFixed(2)} г</p></div>
          <div><p class="text-[10px] text-gray-400">Собівартість</p><p class="font-bold text-neonRed">${cat.costOfGoods.toFixed(2)} €</p></div>
        </div>
      </div>
    `;
  }).join('');
}

export function renderTable(records) {
  const tbody = document.getElementById('recordsTableBody');
  if (records.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="p-4 text-center text-gray-500">Записи відсутні</td></tr>';
    return;
  }

  tbody.innerHTML = records.map(r => {
    const style = getCategoryStyle(r.category);
    return `
      <tr class="hover:bg-brandDark/40 transition">
        <td class="p-3">
          <span class="px-2 py-0.5 rounded text-[10px] font-bold font-mono" style="background: ${style.bg}; color: ${style.text}; border: 1px solid ${style.border}40;">
            ${r.category}
          </span>
        </td>
        <td class="p-3 font-semibold text-gray-200">${r.clientName}</td>
        <td class="p-3 font-mono text-gray-400">${r.baseGramm.toFixed(2)} г</td>
        <td class="p-3 font-mono font-bold text-neonGreen">${r.exactGramm.toFixed(2)} г</td>
        <td class="p-3 font-mono font-bold text-white">${r.eurPaid.toFixed(2)} €</td>
        <td class="p-3 font-mono text-[11px] text-gray-300">${r.rawDebtText || '-'}</td>
        <td class="p-3 font-mono text-gray-400 text-[11px]">${r.timeStr}</td>
      </tr>
    `;
  }).join('');
}

export function renderCharts(categories) {
  const labels = Object.keys(categories).filter(c => c !== 'МОЇ');
  const weights = labels.map(c => categories[c].exactGramm);
  const revenues = labels.map(c => categories[c].eurPaid);
  const colors = labels.map(c => getCategoryStyle(c).border);

  if (barChart) barChart.destroy();
  if (pieChart) pieChart.destroy();

  const ctxBar = document.getElementById('weightBarChart').getContext('2d');
  barChart = new Chart(ctxBar, {
    type: 'bar',
    data: { labels, datasets: [{ data: weights, backgroundColor: colors.map(c => c + '80'), borderColor: colors, borderWidth: 1.5, borderRadius: 6 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
  });

  const ctxPie = document.getElementById('revenuePieChart').getContext('2d');
  pieChart = new Chart(ctxPie, {
    type: 'doughnut',
    data: { labels, datasets: [{ data: revenues, backgroundColor: colors.map(c => c + 'CC'), borderColor: '#0F121C', borderWidth: 2 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: '#94A3B8' } } } }
  });
}