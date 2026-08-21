/**
 * Advanced Parsing Engine using Context Detection
 */
export function parseLogs(rawText) {
  if (!rawText || typeof rawText !== 'string') return [];

  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  let currentCategory = 'UNCATEGORIZED';
  const records = [];

  const TECH_HEADERS = new Set(['name', 'gramm', '€', 'time', 'цена', 'сумма']);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Детекція Категорії (наприклад, "BANNAN" перед блоком "name / gramm / €")
    if (i + 1 < lines.length && TECH_HEADERS.has(lines[i + 1].toLowerCase())) {
      currentCategory = line.toUpperCase();
      continue;
    }

    if (TECH_HEADERS.has(line.toLowerCase())) {
      continue;
    }

    // Спроба розпарсити блок угоди з 4 елементів (Client, Gramm, Money, Time)
    if (i + 3 < lines.length) {
      const clientName = lines[i];
      const rawGramm = lines[i + 1];
      const rawMoney = lines[i + 2];
      const timeStr = lines[i + 3];

      // Валідація за форматом часу (XX.XX або XX:XX)
      if (/(\d{1,2}[\.:]\d{1,2})/.test(timeStr)) {
        const weightData = parseWeight(rawGramm);
        const moneyData = parseMoney(rawMoney, weightData.bonusWeight);

        const baseGramm = weightData.weight;
        const exactGramm = baseGramm * 1.1; // +10% точна вага

        records.push({
          id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          category: currentCategory,
          clientName,
          rawGramm,
          baseGramm,
          exactGramm,
          eurPaid: moneyData.eurPaid, // Вже враховує списання карти з готівки
          debtNew: moneyData.debtNew,
          debtRepaid: moneyData.debtRepaid,
          bonus: moneyData.bonus,
          card: moneyData.card,
          rawDebtText: moneyData.rawText,
          timeStr,
          parsedDate: parseDate(timeStr)
        });

        i += 3; // Пропускаємо оброблені 4 рядки
      }
    }
  }

  return records;
}

function parseWeight(str) {
  let weight = 0;
  let bonusWeight = 0;
  const tokens = str.toLowerCase().replace(',', '.').split(/\s+/);

  tokens.forEach(token => {
    if (token.includes('бонус') || token.includes('bonus')) {
      const num = parseFloat(token.replace(/[^0-9.]/g, ''));
      if (!isNaN(num)) bonusWeight += num;
    } else {
      const matches = token.match(/\d*\.?\d+/g);
      if (matches) {
        matches.forEach(m => {
          const val = parseFloat(m);
          if (!isNaN(val)) weight += val;
        });
      }
    }
  });

  return { weight, bonusWeight };
}

function parseMoney(str, bonusWeightFromGram = 0) {
  let eurPaid = 0, debtNew = 0, debtRepaid = 0, bonus = 0, card = 0;
  const clean = str.toLowerCase().replace(',', '.').trim();

  // 1г бонусу = 10€ еквівалент для інформативного блоку
  if (bonusWeightFromGram > 0) {
    bonus += bonusWeightFromGram * 10;
  }

  const tokens = clean.split(/\s+/);
  tokens.forEach(token => {
    if (token.includes('долг') || token.includes('борг')) {
      const num = parseFloat(token.replace(/[^0-9.]/g, ''));
      if (!isNaN(num)) {
        if (token.includes('-')) debtNew += num;
        else debtRepaid += num;
      }
    } else if (token.includes('бонус') || token.includes('bonus')) {
      const num = parseFloat(token.replace(/[^0-9.]/g, ''));
      if (!isNaN(num)) bonus += num;
    } else if (token.includes('карт') || token.includes('card')) {
      const num = parseFloat(token.replace(/[^0-9.]/g, ''));
      if (!isNaN(num)) card += num;
    } else {
      const num = parseFloat(token.replace(/[^0-9.]/g, ''));
      if (!isNaN(num)) eurPaid += num;
    }
  });

  // Логіка: Карта зменшує факт отриманої готівки (eurPaid)
  const actualEURPaid = Math.max(0, eurPaid - card);

  return { eurPaid: actualEURPaid, debtNew, debtRepaid, bonus, card, rawText: clean };
}

function parseDate(timeStr) {
  const now = new Date();
  let day = now.getDate(), month = now.getMonth(), year = now.getFullYear();
  let hours = 12, minutes = 0;

  const parts = timeStr.split(/\s+/);
  parts.forEach(p => {
    if (p.includes(':')) {
      const [h, m] = p.split(':').map(Number);
      hours = h || 0; minutes = m || 0;
    } else if (p.includes('.')) {
      const [d, m, y] = p.split('.').map(Number);
      if (d) day = d;
      if (m) month = m - 1;
      if (y) year = y < 100 ? 2000 + y : y;
    }
  });

  return new Date(year, month, day, hours, minutes);
}
