// Підключення до БД. Використовуємо вбудований у Node.js модуль node:sqlite —
// це означає жодних native-залежностей (не треба компілювати нічого при npm install).
// Мінімальна версія Node для цього — 22.5. Перевірити свою: `node -v`.
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, 'bar.db');
const SCHEMA_PATH = join(__dirname, 'schema.sql');

export const db = new DatabaseSync(DB_PATH);

// Застосовуємо схему при кожному старті. CREATE TABLE IF NOT EXISTS —
// тому це безпечно виконувати повторно, дані не втрачаються.
const schema = readFileSync(SCHEMA_PATH, 'utf-8');
db.exec(schema);

// Міграція вже існуючої БД: нові колонки в orders (адреса по частинах).
// Для свіжої БД колонки додаються тут же, схема їх не містить навмисно —
// так один шлях для старих і нових баз.
const orderCols = new Set(db.prepare('PRAGMA table_info(orders)').all().map((c) => c.name));
for (const col of ['street', 'house', 'apartment', 'entrance', 'floor', 'intercom']) {
  if (!orderCols.has(col)) {
    db.exec(`ALTER TABLE orders ADD COLUMN ${col} TEXT NOT NULL DEFAULT ''`);
  }
}

// Міграція: публічний токен замовлення. Читати замовлення можна лише за ним
// (довгий випадковий рядок), а не за підряд-ідучим номером. У старих замовлень
// токена нема — через публічний API вони недоступні, це навмисно.
if (!orderCols.has('public_token')) {
  db.exec('ALTER TABLE orders ADD COLUMN public_token TEXT');
}
db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_public_token ON orders(public_token)');

// Якщо таблиця вулиць порожня — підвантажуємо стартовий список,
// щоб підказки працювали одразу. Повний список з OpenStreetMap:
// `node server/database/import-streets.js`
export function normalizeStreetName(name) {
  return name.toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim();
}

const SHORT_PREFIXES = [
  ['вулиця ', 'вул. '],
  ['провулок ', 'пров. '],
  ['проспект ', 'просп. '],
  ['бульвар ', 'бул. '],
  ['площа ', 'пл. '],
  ['набережна ', 'наб. '],
  ['узвіз ', 'узв. '],
  ['тупик ', 'туп. '],
];

export function shortStreetName(name) {
  for (const [full, short] of SHORT_PREFIXES) {
    if (name.toLowerCase().startsWith(full)) return short + name.slice(full.length);
  }
  return name;
}

export function replaceStreets(names) {
  const insert = db.prepare(
    'INSERT OR IGNORE INTO streets (name, short_name, name_search) VALUES (?, ?, ?)'
  );
  db.exec('BEGIN');
  try {
    db.exec('DELETE FROM streets');
    for (const name of names) {
      insert.run(name, shortStreetName(name), normalizeStreetName(name));
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

const streetCount = db.prepare('SELECT COUNT(*) AS n FROM streets').get().n;
if (streetCount === 0) {
  const fallback = JSON.parse(
    readFileSync(join(__dirname, 'streets-fallback.json'), 'utf-8')
  );
  replaceStreets(fallback);
}
