/**
 * State & Store Management
 */
export const store = {
  // Динамічна конфігурація ціни закупівлі за 100г
  procurementCosts: JSON.parse(localStorage.getItem('h2_procurement_costs')) || {
    'BANNAN': 600,
    'SKITTLES': 660
  },
  
  myExpenses: JSON.parse(localStorage.getItem('h2_my_expenses')) || [],
  parsedRecords: [],
  selectedWeekStart: getMonday(new Date()),
  
  // Палітра кольорів для сортів
  colorPalette: [
    { bg: 'rgba(255, 215, 0, 0.15)', border: '#FFD700', text: '#FFD700' },
    { bg: 'rgba(0, 229, 255, 0.15)', border: '#00E5FF', text: '#00E5FF' },
    { bg: 'rgba(157, 0, 255, 0.15)', border: '#9D00FF', text: '#C084FC' },
    { bg: 'rgba(0, 255, 136, 0.15)', border: '#00FF88', text: '#00FF88' },
    { bg: 'rgba(255, 51, 102, 0.15)', border: '#FF3366', text: '#FF3366' }
  ],
  categoryColorMap: {}
};

export function getMonday(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export function saveProcurementCosts() {
  localStorage.setItem('h2_procurement_costs', JSON.stringify(store.procurementCosts));
}

export function saveMyExpenses() {
  localStorage.setItem('h2_my_expenses', JSON.stringify(store.myExpenses));
}