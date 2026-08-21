/**
 * Log Parsing Engine
 */
export function parseWeightAndBonus(str) {
  if (!str) return { weight: 0, bonusWeight: 0 };
  const clean = str.toString().toLowerCase().replace(',', '.').trim();
  let weight = 0, bonusWeight = 0;

  clean.split(/\s+/).forEach(token => {
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

export function parseMoneyDebtBonusCard(str, bonusWeightFromGram = 0) {
  if (!str) return { eurPaid: 0, debtNew: 0, debtRepaid: 0, bonus: 0, card: 0, rawText: '' };
  const clean = str.toString().toLowerCase().replace(',', '.').trim();
  let eurPaid = 0, debtNew = 0, debtRepaid = 0, bonus = 0, card = 0;

  if (bonusWeightFromGram > 0) {
    bonus += bonusWeightFromGram * 10; // Інформативний еквівалент бонусу
  }

  clean.split(/\s+/).forEach(token => {
    if (token.includes('долг') || token.includes('борг')) {
      const hasMinus = token.includes('-');
      const num = parseFloat(token.replace(/[^0-9.]/g, ''));
      if (!isNaN(num)) {
        if (hasMinus) debtNew += num;
        else debtRepaid += num;
      }
    } else if (token.includes('бонус') || token.includes('bonus')) {
      const num = parseFloat(token.replace(/[^0-9.]/g, ''));
      if (!isNaN(num)) bonus += num;
    } else if (token.includes('карт') || token.includes('card')) {
      const num = parseFloat(token.replace(/[^0-9.]/g, ''));
      card += !isNaN(num) ? num : eurPaid;
    } else {
      const matches = token.match(/[-+]?\d*\.?\d+/g);
      if (matches) {
        matches.forEach(m => {
          const val = parseFloat(m);
          if (!isNaN(val) && !token.includes('долг')) eurPaid += val;
        });
      }
    }
  });

  // Карта мінусує факт готівки, АЛЕ БОНУС НЕ МІНУСУЄ ГРОШІ!
  let actualEURPaid = eurPaid;
  if (card > 0) {
    actualEURPaid = card <= eurPaid ? eurPaid - card : 0;
  }

  return { eurPaid: actualEURPaid, debtNew, debtRepaid, bonus, card, rawText: clean };
}

export function parseRecordDateTime(timeStr) {
  const now = new Date();
  let year = now.getFullYear(), month = now.getMonth(), day = now.getDate(), hour = 12, minute = 0;

  timeStr.trim().split(/\s+/).forEach(p => {
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

export function parseLogs(rawText) {
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

    if (techHeaders.includes(line.toLowerCase())) { i++; continue; }

    if (i + 3 < lines.length) {
      const clientName = lines[i];
      const rawGramm = lines[i+1];
      const rawMoney = lines[i+2];
      const timeStr = lines[i+3];

      if (timeStr.includes('.') || timeStr.includes(':')) {
        const weightData = parseWeightAndBonus(rawGramm);
        const moneyData = parseMoneyDebtBonusCard(rawMoney, weightData.bonusWeight);
        
        const baseGramm = weightData.weight;
        const exactGramm = baseGramm * 1.1;

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
          bonus: moneyData.bonus,
          card: moneyData.card,
          rawDebtText: moneyData.rawText,
          timeStr,
          parsedDateObj: parseRecordDateTime(timeStr)
        });

        i += 4;
        continue;
      }
    }
    i++;
  }
  return records;
}