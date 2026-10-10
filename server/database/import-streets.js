// Імпорт вулиць Івано-Франківська з OpenStreetMap (Overpass API) у таблицю streets.
// Запуск (потрібен інтернет, один раз):  node server/database/import-streets.js
// Нічого не ламає: у разі помилки мережі стара таблиця вулиць залишається як є.
import { fileURLToPath } from 'node:url';

const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];

// Усі іменовані дороги всередині адмін-кордону міста, крім пішохідних доріжок,
// сервісних проїздів, сходів тощо — це не адреси для доставки.
const QUERY = `
[out:json][timeout:90];
area["boundary"="administrative"]["name"="Івано-Франківськ"]->.city;
way(area.city)["highway"]["name"]
  ["highway"!~"^(footway|path|steps|cycleway|track|service|bus_guideway|proposed|construction|pedestrian|corridor|platform)$"];
out tags;
`;

const STREET_WORDS = /^(вулиця|провулок|проспект|бульвар|площа|набережна|узвіз|тупик|майдан|шосе|алея)(?=\s|$)/iu;

// Чиста функція (без мережі) — щоб її можна було перевірити окремо.
export function extractStreetNames(overpassJson) {
  const names = new Set();
  for (const el of overpassJson.elements ?? []) {
    const raw = (el.tags?.['name:uk'] || el.tags?.name || '').trim();
    if (!raw) continue;
    if (!/[а-яіїєґ]/i.test(raw)) continue; // тільки кирилиця
    if (/[ыэъё]/i.test(raw)) continue; // російські назви пропускаємо
    // Без префікса типу ("Сахарова") — додаємо "вулиця", як прийнято в адресах.
    names.add(STREET_WORDS.test(raw) ? raw : `вулиця ${raw}`);
  }
  return [...names].sort((a, b) => a.localeCompare(b, 'uk'));
}

async function fetchOverpass() {
  let lastError;
  for (const url of OVERPASS_MIRRORS) {
    try {
      console.log(`Запит до ${url} …`);
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'data=' + encodeURIComponent(QUERY),
        signal: AbortSignal.timeout(120_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      lastError = err;
      console.warn(`  не вийшло: ${err.message}`);
    }
  }
  throw new Error(`Overpass недоступний: ${lastError?.message}`);
}

// Запускаємо імпорт лише коли файл виконують напряму, не при import.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { replaceStreets, db } = await import('./db.js');
  const data = await fetchOverpass();
  const names = extractStreetNames(data);
  if (names.length < 50) {
    console.error(`Підозріло мало вулиць (${names.length}) — не перезаписую таблицю.`);
    process.exit(1);
  }
  replaceStreets(names);
  const n = db.prepare('SELECT COUNT(*) AS n FROM streets').get().n;
  console.log(`Готово: у таблиці streets ${n} вулиць. Приклади:`, names.slice(0, 8).join(' | '));
}
