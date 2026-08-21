/**
 * Safe Rendering Engine with Canvas Recycling
 */
let barChartInstance = null;
let pieChartInstance = null;

export function renderProcurementList(container, procurementCosts, onDelete, OnChange) {
  container.innerHTML = Object.entries(procurementCosts).map(([cat, cost]) => `
    <div class="flex items-center justify-between bg-brandDark/50 p-2 rounded-lg border border-brandBorder">
      <span class="font-bold text-xs text-neonBlue font-mono">${cat}</span>
      <div class="flex items-center gap-2">
        <input type="number" value="${cost}" data-cat="${cat}" class="input-cost w-20 bg-brandCard text-right text-xs p-1 rounded border border-brandBorder text-white font-mono" />
        <span class="text-[10px] text-gray-400">€/100г</span>
        <button data-cat="${cat}" class="btn-del text-red-400 hover:text-red-300 font-bold px-1">×</button>
      </div>
    </div>
  `).join('');

  container.querySelectorAll('.input-cost').forEach(el => {
    el.addEventListener('change', (e) => OnChange(e.target.dataset.cat, parseFloat(e.target.value)));
  });
  container.querySelectorAll('.btn-del').forEach(el => {
    el.addEventListener('click', (e) => onDelete(e.target.dataset.cat));
  });
}

export function updateCharts(categories) {
  const labels = Object.keys(categories);
  const weights = labels.map(k => categories[k].exactGramm);
  const revenues = labels.map(k => categories[k].eurPaid);

  const ctxBar = document.getElementById('weightBarChart')?.getContext('2d');
  const ctxPie = document.getElementById('revenuePieChart')?.getContext('2d');

  if (!ctxBar || !ctxPie) return;

  // Запобігання витоку пам'яті через Chart Manager pattern
  if (barChartInstance) {
    barChartInstance.data.labels = labels;
    barChartInstance.data.datasets[0].data = weights;
    barChartInstance.update();
  } else {
    barChartInstance = new Chart(ctxBar, {
      type: 'bar',
      data: {
        labels,
        datasets: [{ label: 'Точна вага (г)', data: weights, backgroundColor: '#00E5FF80', borderColor: '#00E5FF', borderWidth: 1 }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }

  if (pieChartInstance) {
    pieChartInstance.data.labels = labels;
    pieChartInstance.data.datasets[0].data = revenues;
    pieChartInstance.update();
  } else {
    pieChartInstance = new Chart(ctxPie, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{ data: revenues, backgroundColor: ['#00E5FF', '#00FF88', '#FFD700', '#FF3366', '#9D00FF'] }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }
}
