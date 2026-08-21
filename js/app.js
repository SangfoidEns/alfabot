/**
 * Humans 2.0 Engine - Core Application Logic
 */

(() => {
  'use strict';

  // --- CONFIG & CONSTANTS ---
  const COST_PER_EXACT_GRAM = {
    'BANNAN': 600 / 110,
    'SKITTLES': 660 / 110
  };

  const COLOR_PALETTE = [
    { bg: 'rgba(255, 215, 0, 0.15)', border: '#FFD700', text: '#FFD700' },
    { bg: 'rgba(0, 229, 255, 0.15)', border: '#00E5FF', text: '#00E5FF' },
    { bg: 'rgba(157, 0, 255, 0.15)', border: '#9D00FF', text: '#C084FC' },
    { bg: 'rgba(0, 255, 136, 0.15)', border: '#00FF88', text: '#00FF88' },
    { bg: 'rgba(255, 51, 102, 0.15)', border: '#FF3366', text: '#FF3366' }
  ];

  // --- STATE ---
  let barChart = null;
  let pieChart = null;
  let myExpenses = [];
  let parsedRecordsGlobal = [];
  let selectedWeekStart = getMonday(new Date());
  const categoryColorMap = {};

  // --- UTILS ---
  function sanitizeHTML(str) {
    const temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
  }

  function getMonday(d) {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  }

  function getCategoryStyle(catName) {
    const upper = catName.toUpperCase();
    if (!categoryColorMap[upper]) {
      const keys = Object.keys(categoryColorMap);
      const paletteIndex = keys.length % COLOR_PALETTE.length;
      categoryColorMap[upper] = COLOR_PALETTE[paletteIndex];
    }
    return categoryColorMap[upper];
  }

  function updateClock() {
    const now = new Date();
    const clockElem = document.getElementById('liveClock');
    const daysShort = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    const dayName = daysShort[now.getDay()];
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    if (clockElem) clockElem.innerText = `${dayName}, ${timeStr}`;
  }

  // --- PARSERS ---
  function parseWeight(str) {
    if (!str) return 0;
    const clean = str.toString().toLowerCase().replace(',', '.');
    const matches = clean.match(/\d*\.?\d+/g);
    if (!matches) return 0;
    return matches.reduce((acc, curr) => acc + parseFloat(curr), 0);
  }

  function parseMoneyAndDebt(str) {
    if (!str) return { eurPaid: 0, debtNew: 0, debtRepaid: 0, rawDebtText: '' };

    const clean = str.toString().toLowerCase().replace(',', '.').trim();
    let eurPaid = 0;
    let debtNew = 0;
    let debtRepaid = 0;
    let rawDebtText = '';

    if (clean.includes('долг')) {
      rawDebtText = clean;
      const tokens = clean.split(/\s+/);

      tokens.forEach(token => {
        if (token.includes('долг')) {
          const numMatch = token.match(/[-+]?\d*\.?\d+/);
          if (numMatch) {
            const val = parseFloat(numMatch[0]);
            if (val < 0) {
              debtNew += Math.abs(val);
            } else if (val > 0) {
              debtRepaid += val;
            }
          }
        } else {
          const num = parseFloat(token);
          if (!isNaN(num) && num > 0) {
            eurPaid += num;
          }
        }
      });
    } else {
      const matches = clean.match(/\d*\.?\d+/g);
      if (matches) {
        eurPaid = matches.reduce((acc, curr) => acc + parseFloat(curr), 0);
      }
    }

    return { eurPaid, debtNew, debtRepaid, rawDebtText };
  }

  function parseRecordDateTime(timeStr) {
    const now = new Date();
    let year = now.getFullYear();
    let month = now.getMonth();
    let day = now.getDate();
    let hour = 12;
    let minute = 0;

    const parts = timeStr.trim().split(/\s+/);

    parts.forEach(p => {
      if (p.includes(':')) {
        const hm = p.split(':');
        hour = parseInt(hm[0], 10) || 0;
        minute = parseInt(hm[1], 10) || 0;
      } else if (p.includes('.')) {
        const dmp = p.split('.');
        if (dmp[0]) day = parseInt(dmp[0], 10);
        if (dmp[1]) month = parseInt(dmp[1], 10) - 1;
        if (dmp[2]) year = parseInt(dmp[2], 10);
        if (year < 100) year += 2000;
      }
    });

    return new Date(year, month, day, hour, minute);
  }

  function parseLogs(rawText) {
    if (!rawText) return [];
    const lines = rawText.split('\n').map(l => l.trim()).filter(l => l !== '');
    let currentCategory = 'UNCATEGORIZED';
    const records = [];
    const techHeaders = ['name', 'gramm', '€', 'time'];

    let i = 0;
    while (i < lines.length) {
      const line = lines[i];

      if (i + 3 < lines.length && 
          lines[i+1].toLowerCase() === 'name' && 
          lines[i+2].toLowerCase() === 'gramm' && 
          lines[i+3] === '€') {
        currentCategory = line.toUpperCase();
        i += 5;
        continue;
      }

      if (techHeaders.includes(line.toLowerCase())) {
        i++;
        continue;
      }

      if (i + 3 < lines.length) {
        const clientName = lines[i];
        const rawGramm = lines[i+1];
        const rawMoney = lines[i+2];
        const timeStr = lines[i+3];

        if (timeStr.includes('.') || timeStr.includes(':')) {
          const baseGramm = parseWeight(rawGramm);
          const exactGramm = baseGramm * 1.1;
          const moneyData = parseMoneyAndDebt(rawMoney);
          const parsedDateObj = parseRecordDateTime(timeStr);

          records.push({
            category: currentCategory,
            clientName,
            rawGramm,
            baseGramm,
            exactGramm,
            rawMoney,
            eurPaid: moneyData.eurPaid,
            debtNew: moneyData.debtNew,
            debtRepaid: moneyData.debtRepaid,
            rawDebtText: moneyData.rawDebtText,
            timeStr,
            parsedDateObj
          });

          i += 4;
          continue;
        }
      }
      i++;
    }
    return records;
  }

  // --- CORE ENGINE ---
  function processData() {
    const rawInputElem = document.getElementById('rawInput');
    const rawText = rawInputElem ? rawInputElem.value : '';
    localStorage.setItem('h2_raw_logs', rawText);

    parsedRecordsGlobal = parseLogs(rawText);

    let totalEURPaid = 0;
    let totalBaseGramm = 0;
    let totalExactGramm = 0;

    const clientNewDebts = {};
    const clientRepaidDebts = {};
    const categories = {};

    parsedRecordsGlobal.forEach(r => {
      totalEURPaid += r.eurPaid;
      totalBaseGramm += r.baseGramm;
      totalExactGramm += r.exactGramm;

      if (r.debtNew > 0) clientNewDebts[r.clientName] = (clientNewDebts[r.clientName] || 0) + r.debtNew;
      if (r.debtRepaid > 0) clientRepaidDebts[r.clientName] = (clientRepaidDebts[r.clientName] || 0) + r.debtRepaid;

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

    Object.keys(categories).forEach(catName => {
      const cat = categories[catName];
      const unitCost = COST_PER_EXACT_GRAM[catName] || 0;
      cat.costOfGoods = cat.exactGramm * unitCost;
      cat.netProfit = cat.eurPaid - cat.costOfGoods;
      totalCostOfGoods += cat.costOfGoods;
      totalNetProfit += cat.netProfit;
    });

    let myTotalSum = 0;
    myExpenses.forEach(item => { myTotalSum += item.amount; });

    totalEURPaid += myTotalSum;
    totalNetProfit += myTotalSum;

    if (myExpenses.length > 0) {
      categories['МОЇ'] = { deals: myExpenses.length, baseGramm: 0, exactGramm: 0, eurPaid: myTotalSum, costOfGoods: 0, netProfit: myTotalSum };
    }

    let totalActiveDebt = 0;
    const clientActiveDebts = {};
    const allClients = new Set([...Object.keys(clientNewDebts), ...Object.keys(clientRepaidDebts)]);
    allClients.forEach(name => {
      const active = (clientNewDebts[name] || 0) - (clientRepaidDebts[name] || 0);
      if (active > 0) {
        clientActiveDebts[name] = active;
        totalActiveDebt += active;
      }
    });

    document.getElementById('kpiRevenue').innerText = `${totalEURPaid.toFixed(2)} €`;
    document.getElementById('kpiNetProfit').innerText = `${totalNetProfit.toFixed(2)} €`;
    document.getElementById('kpiCostOfGoods').innerText = `${totalCostOfGoods.toFixed(2)} €`;
    document.getElementById('kpiActiveDebt').innerText = `${totalActiveDebt.toFixed(0)} €`;
    document.getElementById('kpiBaseWeight').innerText = `${totalBaseGramm.toFixed(2)} г`;
    document.getElementById('kpiExactWeight').innerText = `${totalExactGramm.toFixed(2)} г`;
    document.getElementById('kpiDeals').innerText = parsedRecordsGlobal.length;

    renderMyExpensesUI(myTotalSum);
    renderDebtsList('activeDebtsList', clientActiveDebts, 'text-neonYellow', '-');
    renderDebtsList('repaidDebtsList', clientRepaidDebts, 'text-emerald-400', '+');
    renderCategoryCards(categories);
    renderTable(parsedRecordsGlobal);
    renderCharts(categories);
    renderInteractiveHeatmap();
  }

  // --- RENDERERS ---
  function renderMyExpensesUI(total) {
    document.getElementById('myTotalDisplay').innerText = `${total.toFixed(2)} €`;
    const container = document.getElementById('myExpensesList');
    if (myExpenses.length === 0) {
      container.innerHTML = '<p class="text-gray-500 text-[11px]">Записи відсутні</p>';
      return;
    }
    container.innerHTML = myExpenses.slice().reverse().map(item => `
      <div class="flex justify-between items-center bg-brandDark/60 p-1.5 rounded-lg border border-brandBorder">
        <div class="truncate pr-2">
          <span class="text-gray-300">${sanitizeHTML(item.note)}</span>
          <span class="text-[9px] text-gray-500 block">${item.time}</span>
        </div>
        <div class="flex items-center gap-1.5 shrink-0">
          <span class="font-bold ${item.amount >= 0 ? 'text-emerald-400' : 'text-red-400'}">${item.amount >= 0 ? '+' : ''}${item.amount} €</span>
          <button data-expense-id="${item.id}" class="btn-remove-expense text-gray-500 hover:text-red-400 font-bold px-1">×</button>
        </div>
      </div>
    `).join('');

    container.querySelectorAll('.btn-remove-expense').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = parseInt(e.target.getAttribute('data-expense-id'), 10);
        removeMyExpense(id);
      });
    });
  }

  function renderDebtsList(elementId, debtObj, colorClass, prefix) {
    const container = document.getElementById(elementId);
    const keys = Object.keys(debtObj);
    if (keys.length === 0) {
      container.innerHTML = '<p class="text-gray-500">Немає даних</p>';
      return;
    }
    container.innerHTML = keys.map(client => `
      <div class="flex justify-between items-center border-b border-brandBorder/40 pb-1">
        <span class="text-gray-300 font-medium">${sanitizeHTML(client)}</span>
        <span class="font-mono font-bold ${colorClass}">${prefix}${debtObj[client].toFixed(2)} €</span>
      </div>
    `).join('');
  }

  function renderCategoryCards(categories) {
    const container = document.getElementById('categorySummaryCards');
    container.innerHTML = Object.keys(categories).map(catName => {
      const cat = categories[catName];
      const style = getCategoryStyle(catName);
      return `
        <div class="bg-brandCard/90 p-4 rounded-2xl border" style="border-color: ${style.border}40;">
          <div class="flex justify-between items-center mb-3">
            <span class="px-2 py-0.5 rounded text-xs font-bold font-mono" style="background: ${style.bg}; color: ${style.text}; border: 1px solid ${style.border}60;">
              ${sanitizeHTML(catName)}
            </span>
            <span class="text-xs text-gray-400 font-mono">${cat.deals} угод</span>
          </div>
          <div class="grid grid-cols-2 gap-2 text-xs">
            <div>
              <p class="text-[10px] text-gray-400">Отримано</p>
              <p class="font-bold text-white">${cat.eurPaid.toFixed(2)} €</p>
            </div>
            <div>
              <p class="text-[10px] text-gray-400">Чистий прибуток</p>
              <p class="font-bold text-neonGreen">${cat.netProfit.toFixed(2)} €</p>
            </div>
            <div>
              <p class="text-[10px] text-gray-400">Точна вага</p>
              <p class="font-bold text-gray-200">${cat.exactGramm.toFixed(2)} г</p>
            </div>
            <div>
              <p class="text-[10px] text-gray-400">Собівартість</p>
              <p class="font-bold text-neonRed">${cat.costOfGoods.toFixed(2)} €</p>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  function renderTable(records) {
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
              ${sanitizeHTML(r.category)}
            </span>
          </td>
          <td class="p-3 font-semibold text-gray-200">${sanitizeHTML(r.clientName)}</td>
          <td class="p-3 font-mono text-gray-400">${r.baseGramm.toFixed(2)} г</td>
          <td class="p-3 font-mono font-bold text-neonGreen">${r.exactGramm.toFixed(2)} г</td>
          <td class="p-3 font-mono font-bold text-white">${r.eurPaid.toFixed(2)} €</td>
          <td class="p-3 font-mono text-[11px] ${r.debtNew > 0 ? 'text-neonYellow' : r.debtRepaid > 0 ? 'text-emerald-400' : 'text-gray-500'}">
            ${sanitizeHTML(r.rawDebtText) || '-'}
          </td>
          <td class="p-3 font-mono text-gray-400 text-[11px]">${sanitizeHTML(r.timeStr)}</td>
        </tr>
      `;
    }).join('');
  }

  function renderCharts(categories) {
    const labels = Object.keys(categories).filter(c => c !== 'МОЇ');
    const weights = labels.map(c => categories[c].exactGramm);
    const revenues = labels.map(c => categories[c].eurPaid);
    const colors = labels.map(c => getCategoryStyle(c).border);

    if (barChart) barChart.destroy();
    if (pieChart) pieChart.destroy();

    const ctxBar = document.getElementById('weightBarChart').getContext('2d');
    barChart = new Chart(ctxBar, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          data: weights,
          backgroundColor: colors.map(c => c + '80'),
          borderColor: colors,
          borderWidth: 1.5,
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#94A3B8', font: { size: 10 } }, grid: { display: false } },
          y: { ticks: { color: '#94A3B8', font: { size: 10 } }, grid: { color: '#1A2133' } }
        }
      }
    });

    const ctxPie = document.getElementById('revenuePieChart').getContext('2d');
    pieChart = new Chart(ctxPie, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data: revenues,
          backgroundColor: colors.map(c => c + 'CC'),
          borderColor: '#0F121C',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right', labels: { color: '#94A3B8', font: { size: 10 } } }
        }
      }
    });
  }

  function renderInteractiveHeatmap() {
    const daysNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];
    const weekEnd = new Date(selectedWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const formatDateShort = (d) => `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}`;
    document.getElementById('heatmapPeriodText').innerText = `${formatDateShort(selectedWeekStart)} — ${formatDateShort(weekEnd)}`;

    const matrix = Array(7).fill(0).map(() => Array(24).fill(0));
    let maxDealsInHour = 0;

    parsedRecordsGlobal.forEach(r => {
      if (!r.parsedDateObj) return;
      const d = r.parsedDateObj;

      if (d >= selectedWeekStart && d <= new Date(weekEnd.getTime() + 86399999)) {
        let jsDay = d.getDay();
        let mondayIndex = jsDay === 0 ? 6 : jsDay - 1;
        let hour = d.getHours();

        matrix[mondayIndex][hour] += 1;
        if (matrix[mondayIndex][hour] > maxDealsInHour) {
          maxDealsInHour = matrix[mondayIndex][hour];
        }
      }
    });

    const now = new Date();
    const currentJsDay = now.getDay();
    const currentMondayIndex = currentJsDay === 0 ? 6 : currentJsDay - 1;
    const currentHour = now.getHours();
    const isCurrentWeek = getMonday(now).getTime() === selectedWeekStart.getTime();

    const rowsContainer = document.getElementById('heatmapGridRows');
    rowsContainer.innerHTML = '';

    for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
      const rowDate = new Date(selectedWeekStart);
      rowDate.setDate(rowDate.getDate() + dayIdx);

      const rowDiv = document.createElement('div');
      rowDiv.className = 'grid grid-cols-[60px_repeat(24,1fr)] gap-1 items-center';

      const isToday = isCurrentWeek && dayIdx === currentMondayIndex;
      const dayLabel = document.createElement('div');
      dayLabel.className = `text-[10px] font-mono flex items-center justify-between pr-1.5 ${isToday ? 'text-neonBlue font-bold' : 'text-gray-400'}`;
      dayLabel.innerHTML = `<span>${daysNames[dayIdx]}</span><span class="text-[8px] text-gray-500">${String(rowDate.getDate()).padStart(2,'0')}</span>`;
      rowDiv.appendChild(dayLabel);

      for (let h = 0; h < 24; h++) {
        const count = matrix[dayIdx][h];
        const cell = document.createElement('div');

        const isNow = isToday && h === currentHour;

        let bgStyle = 'background-color: #0D111A; border: 1px solid rgba(26, 33, 51, 0.6);';
        if (count > 0) {
          const ratio = count / (maxDealsInHour || 1);
          if (ratio <= 0.33) {
            bgStyle = 'background-color: rgba(6, 78, 59, 0.65); border: 1px solid rgba(16, 185, 129, 0.3);';
          } else if (ratio <= 0.66) {
            bgStyle = 'background-color: rgba(5, 150, 105, 0.85); border: 1px solid rgba(52, 211, 153, 0.5);';
          } else {
            bgStyle = 'background-color: #00FF88; border: 1px solid #6EE7B7; box-shadow: 0 0 6px rgba(0, 255, 136, 0.5);';
          }
        }

        cell.className = `hm-cell h-5 rounded-[3px] flex items-center justify-center text-[9px] font-mono font-bold cursor-pointer ${isNow ? 'hm-current-time' : ''}`;
        cell.style = bgStyle;

        if (count > 0) {
          cell.innerHTML = `<span class="${count / (maxDealsInHour || 1) > 0.66 ? 'text-black' : 'text-emerald-100'}">${count}</span>`;
        }

        cell.title = `📅 ${daysNames[dayIdx]}, ${formatDateShort(rowDate)}\n⏰ Час: ${String(h).padStart(2,'0')}:00 - ${String(h).padStart(2,'0')}:59\n📊 Кількість угод: ${count}`;

        rowDiv.appendChild(cell);
      }

      rowsContainer.appendChild(rowDiv);
    }
  }

  // --- ACTIONS ---
  function addMyExpense(type) {
    const noteInput = document.getElementById('myExpenseNote');
    const amountInput = document.getElementById('myExpenseAmount');

    const note = noteInput.value.trim() || 'Без опису';
    let amount = parseFloat(amountInput.value);

    if (isNaN(amount) || amount <= 0) return;

    if (type === 'sub') {
      amount = -Math.abs(amount);
    } else {
      amount = Math.abs(amount);
    }

    myExpenses.push({
      id: Date.now(),
      note,
      amount,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });

    noteInput.value = '';
    amountInput.value = '';

    saveMyExpenses();
    processData();
  }

  function removeMyExpense(id) {
    myExpenses = myExpenses.filter(item => item.id !== id);
    saveMyExpenses();
    processData();
  }

  function saveMyExpenses() {
    localStorage.setItem('h2_my_expenses', JSON.stringify(myExpenses));
  }

  function loadMyExpenses() {
    const saved = localStorage.getItem('h2_my_expenses');
    if (saved) {
      try { myExpenses = JSON.parse(saved); } catch(e) { myExpenses = []; }
    }
  }

  function clearAllData() {
    localStorage.removeItem('h2_raw_logs');
    localStorage.removeItem('h2_my_expenses');
    document.getElementById('rawInput').value = '';
    myExpenses = [];
    processData();
  }

  function loadSampleData() {
    const sample = `BANNAN
Name
Gramm
€
Time
01.08.2025

Олексій
10,0
100
14:30

Дмитро
5.0
50
15:15

SKITTLES
Name
Gramm
€
Time
01.08.2025

Іван
20.0
200
14:45

Олексій
15.0
150 долг -50
18:20`;

    document.getElementById('rawInput').value = sample;
    processData();
  }

  function filterTable() {
    const val = document.getElementById('tableSearch').value.toLowerCase();
    const rows = document.querySelectorAll('#recordsTableBody tr');
    rows.forEach(row => {
      const text = row.innerText.toLowerCase();
      row.style.display = text.includes(val) ? '' : 'none';
    });
  }

  // --- ATTACH EVENT LISTENERS (Clean Events Architecture) ---
  function initEvents() {
    document.getElementById('btnLoadSample').addEventListener('click', loadSampleData);
    document.getElementById('btnClearAll').addEventListener('click', clearAllData);
    document.getElementById('btnProcessData').addEventListener('click', processData);
    document.getElementById('btnAddIncome').addEventListener('click', () => addMyExpense('add'));
    document.getElementById('btnAddExpense').addEventListener('click', () => addMyExpense('sub'));

    document.getElementById('tableSearch').addEventListener('keyup', filterTable);

    document.getElementById('btnPrevWeek').addEventListener('click', () => {
      selectedWeekStart.setDate(selectedWeekStart.getDate() - 7);
      renderInteractiveHeatmap();
    });

    document.getElementById('btnTodayWeek').addEventListener('click', () => {
      selectedWeekStart = getMonday(new Date());
      renderInteractiveHeatmap();
    });

    document.getElementById('btnNextWeek').addEventListener('click', () => {
      selectedWeekStart.setDate(selectedWeekStart.getDate() + 7);
      renderInteractiveHeatmap();
    });

    document.getElementById('heatmapDatePicker').addEventListener('change', (e) => {
      if (!e.target.value) return;
      selectedWeekStart = getMonday(new Date(e.target.value));
      renderInteractiveHeatmap();
    });
  }

  // --- INIT ---
  document.addEventListener('DOMContentLoaded', () => {
    setInterval(updateClock, 1000);
    updateClock();

    initEvents();
    loadMyExpenses();

    const savedRaw = localStorage.getItem('h2_raw_logs');
    if (savedRaw) {
      document.getElementById('rawInput').value = savedRaw;
      processData();
    } else {
      loadSampleData();
    }
  });

})();