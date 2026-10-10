import { Router } from 'express';
import { db, normalizeStreetName } from '../database/db.js';

export const streetsRouter = Router();

// GET /api/streets?q=шев — підказки вулиць Івано-Франківська.
// Пошук по всіх словах запиту (порядок не важливий): "шевч тараса" знайде "вулиця Тараса Шевченка".
// Спочатку вулиці, де слово запиту — початок слова в назві, потім решта.
streetsRouter.get('/', (req, res) => {
  const q = normalizeStreetName(String(req.query.q || ''));
  if (q.length < 2) return res.json([]);

  const tokens = q.split(' ').filter(Boolean).slice(0, 5);
  const where = tokens.map(() => 'name_search LIKE ?').join(' AND ');
  const params = tokens.map((t) => `%${t.replace(/[%_]/g, '')}%`);

  const rows = db
    .prepare(`SELECT name, short_name FROM streets WHERE ${where} LIMIT 60`)
    .all(...params);

  // 0 — слово запиту є початком якогось слова назви ("шев" → "Тараса Шевченка"),
  // 1 — просто міститься всередині ("шев" → "Грушевського").
  const rank = (row) => {
    const words = normalizeStreetName(row.name).replace(/^\S+\s/, '').split(/[\s.\-]+/);
    return words.some((w) => w.startsWith(tokens[0])) ? 0 : 1;
  };
  rows.sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name, 'uk'));

  res.json(rows.slice(0, 8).map((r) => ({ name: r.name, label: r.short_name })));
});
