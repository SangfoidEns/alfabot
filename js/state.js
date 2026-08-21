/**
 * Single Source of Truth for Application State
 */
class AppState {
  constructor() {
    this.procurementCosts = this.load('h2_procurement_costs', {
      'BANNAN': 600,
      'SKITTLES': 660
    });
    this.myExpenses = this.load('h2_my_expenses', []);
    this.rawLogs = localStorage.getItem('h2_raw_logs') || '';
    this.parsedRecords = [];
    this.listeners = [];
  }

  load(key, fallback) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : fallback;
    } catch (e) {
      console.error(`Error loading key ${key}:`, e);
      return fallback;
    }
  }

  subscribe(listener) {
    this.listeners.push(listener);
  }

  notify() {
    this.listeners.forEach(fn => fn(this));
  }

  setRawLogs(logs) {
    this.rawLogs = logs;
    localStorage.setItem('h2_raw_logs', logs);
    this.notify();
  }

  setProcurementCost(category, cost) {
    if (cost <= 0 || isNaN(cost)) return;
    this.procurementCosts[category.toUpperCase()] = cost;
    localStorage.setItem('h2_procurement_costs', JSON.stringify(this.procurementCosts));
    this.notify();
  }

  removeProcurementCost(category) {
    delete this.procurementCosts[category.toUpperCase()];
    localStorage.setItem('h2_procurement_costs', JSON.stringify(this.procurementCosts));
    this.notify();
  }

  addExpense(expense) {
    this.myExpenses.push(expense);
    localStorage.setItem('h2_my_expenses', JSON.stringify(this.myExpenses));
    this.notify();
  }

  removeExpense(id) {
    this.myExpenses = this.myExpenses.filter(e => e.id !== id);
    localStorage.setItem('h2_my_expenses', JSON.stringify(this.myExpenses));
    this.notify();
  }
}

export const state = new AppState();
