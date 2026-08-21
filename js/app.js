/**
 * Main App Core Module
 */
import { store, saveMyExpenses, saveProcurementCosts, getMonday } from './state.js';
import { parseLogs } from './parsers.js';
import { renderProcurementSettings, renderMyExpensesUI, renderCategoryCards, renderTable, renderCharts } from './renderers.js';

function processData() {
  const rawText = document.getElementById('rawInput')?.value || '';
  localStorage.setItem('h2_raw_logs', rawText);

  store.parsedRecords = parseLogs(rawText);
  const autoExpenses = [];

  let totalEURPaid = 0;
  let totalBaseGramm = 0;
  let totalExactGramm = 0;
  const categories = {};

  store.parsedRecords.forEach(r => {
    totalEURPaid += r.eurPaid;
    totalBaseGramm += r.baseGramm;
    totalExactGramm += r.exactGramm;

    // БОНУС: Тільки для відображення в "МОЇ", НЕ віднімається з eurPaid!
    if (r.bonus > 0) {
      autoExpenses.push({
        id: 'auto_bonus_' + Math.random(),
        note: `Бонус: ${r.clientName} (${r.category})`,
        amount: -Math.abs(r.bonus),
        time: r.timeStr,
        isAuto: true,
        isBonus: true
      });
    }

    // КАРТА: Інформативно додає безготівковий дохід в "МОЇ"
    if (r.card > 0) {
      autoExpenses.push({
        id: 'auto_card_' + Math.random(),
        note: `Карта: ${r.clientName} (${r.category})`,
        amount: Math.abs(r.card),
        time: r.timeStr,
        isAuto: true,
        isBonus: false
      });
    }

    if (!categories[r.category]) {
      categories[r.category] = { deals: 0, baseGramm: 0, exactGramm: 0, eurPaid: 0, costOfGoods: 0, netProfit: 0 };
    }

    categories[r.category].deals += 1;
    categories[r.category].baseGramm += r.baseGramm;
    categories[r.category].exactGramm += r.exactGramm;
    categories[r.category].eurPaid += r.eurPaid;
  });

  let totalCostOfGoods = 0;
  let totalNetProfit = 0;

  // Динамічний розрахунок собівартості на основі конфігуратора закупки
  Object.keys(categories).forEach(catName => {
    const cat = categories[catName];
    const costPer100g = store.procurementCosts[catName] || 0;
    const unitCostPerGram = costPer100g / 110; // Розрахунок з урахуванням +10% точної ваги

    cat.costOfGoods = cat.exactGramm * unitCostPerGram;
    cat.netProfit = cat.eurPaid - cat.costOfGoods;
    totalCostOfGoods += cat.costOfGoods;
    totalNetProfit += cat.netProfit;
  });

  const combinedMyExpenses = [...store.myExpenses, ...autoExpenses];
  let myTotalSum = 0;
  combinedMyExpenses.forEach(item => {
    if (!item.isBonus) myTotalSum += item.amount; // Бонус не впливає на фінансовий баланс Моїх
  });

  document.getElementById('kpiRevenue').innerText = `${totalEURPaid.toFixed(2)} €`;
  document.getElementById('kpiNetProfit').innerText = `${totalNetProfit.toFixed(2)} €`;
  document.getElementById('kpiCostOfGoods').innerText = `${totalCostOfGoods.toFixed(2)} €`;
  document.getElementById('kpiBaseWeight').innerText = `${totalBaseGramm.toFixed(2)} г`;
  document.getElementById('kpiExactWeight').innerText = `${totalExactGramm.toFixed(2)} г`;

  renderMyExpensesUI(combinedMyExpenses, myTotalSum, (id) => {
    store.myExpenses = store.myExpenses.filter(i => i.id !== id);
    saveMyExpenses();
    processData();
  });
  renderCategoryCards(categories);
  renderTable(store.parsedRecords);
  renderCharts(categories);
}

// Додавання нової закупки сорту
document.getElementById('btnAddProcurement')?.addEventListener('click', () => {
  const nameInput = document.getElementById('newProcurementName');
  const costInput = document.getElementById('newProcurementCost');
  const name = nameInput.value.trim().toUpperCase();
  const cost = parseFloat(costInput.value);

  if (name && !isNaN(cost) && cost > 0) {
    store.procurementCosts[name] = cost;
    saveProcurementCosts();
    nameInput.value = '';
    costInput.value = '';
    renderProcurementSettings(processData);
    processData();
  }
});

document.addEventListener('DOMContentLoaded', () => {
  renderProcurementSettings(processData);
  const savedRaw = localStorage.getItem('h2_raw_logs');
  if (savedRaw) {
    document.getElementById('rawInput').value = savedRaw;
  }
  processData();
});
