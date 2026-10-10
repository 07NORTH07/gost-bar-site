import { Router } from 'express';
import express from 'express';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { mkdirSync, writeFileSync, unlinkSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { db } from '../database/db.js';

export const adminRouter = Router();

const __dirname = dirname(fileURLToPath(import.meta.url));
export const UPLOADS_DIR = join(__dirname, '..', '..', 'uploads');
const PRODUCT_IMG_DIR = join(UPLOADS_DIR, 'products');
mkdirSync(PRODUCT_IMG_DIR, { recursive: true });

// ---------- Авторизація ----------
// Пароль береться зі змінної середовища ADMIN_PASSWORD. Якщо її не задано —
// на кожному старті генерується випадковий і друкується в консоль.
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || randomBytes(6).toString('hex');
if (!process.env.ADMIN_PASSWORD) {
  console.log(`Адмінка: ADMIN_PASSWORD не задано, тимчасовий пароль на цей запуск: ${ADMIN_PASSWORD}`);
}

const TOKEN_TTL_MS = 12 * 60 * 60 * 1000;
const tokens = new Map(); // token -> expiresAt
const attempts = new Map(); // ip -> { count, resetAt }

function safeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

adminRouter.post('/login', express.json({ limit: '2kb' }), (req, res) => {
  const ip = req.ip;
  const now = Date.now();
  const rec = attempts.get(ip);
  if (rec && rec.resetAt > now && rec.count >= 8) {
    return res.status(429).json({ error: 'Забагато спроб. Спробуйте за 15 хвилин.' });
  }
  if (!safeEqual(req.body?.password ?? '', ADMIN_PASSWORD)) {
    const next = rec && rec.resetAt > now ? rec : { count: 0, resetAt: now + 15 * 60 * 1000 };
    next.count += 1;
    attempts.set(ip, next);
    return res.status(401).json({ error: 'Невірний пароль' });
  }
  attempts.delete(ip);
  const token = randomBytes(24).toString('hex');
  tokens.set(token, now + TOKEN_TTL_MS);
  res.json({ token });
});

function requireAdmin(req, res, next) {
  const header = req.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const expires = tokens.get(token);
  if (!expires || expires < Date.now()) {
    tokens.delete(token);
    return res.status(401).json({ error: 'Потрібен вхід' });
  }
  next();
}

adminRouter.use(requireAdmin);
// Фото приходять з браузера вже стиснутими (≈100–300 КБ), 6 МБ — з запасом.
adminRouter.use(express.json({ limit: '6mb' }));

// ---------- Допоміжне ----------
function toAdminProduct(row) {
  return {
    id: row.id,
    categoryId: row.category_id,
    categoryName: row.category_name,
    section: row.section,
    name: row.name,
    description: row.description,
    price: row.price,
    unit: row.unit,
    imageUrl: row.image_url,
    isNew: !!row.is_new,
    isSpicy: !!row.is_spicy,
    inStock: !!row.in_stock,
  };
}

const SELECT_PRODUCT = `
  SELECT p.*, c.name AS category_name, c.section AS section
  FROM products p JOIN categories c ON c.id = p.category_id`;

function parseJpegDataUrl(dataUrl, maxBytes) {
  const m = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ''));
  if (!m) throw new Error('Фото має бути у форматі JPEG');
  const buf = Buffer.from(m[1], 'base64');
  if (buf.length > maxBytes) throw new Error('Фото завелике');
  // Перевіряємо справжній підпис JPEG, а не лише заголовок data URL.
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8 || buf[2] !== 0xff) {
    throw new Error('Файл не схожий на JPEG');
  }
  return buf;
}

function saveProductImage(image) {
  const full = parseJpegDataUrl(image?.full, 2 * 1024 * 1024);
  const thumb = parseJpegDataUrl(image?.thumb, 600 * 1024);
  const base = `${Date.now()}-${randomBytes(4).toString('hex')}`;
  writeFileSync(join(PRODUCT_IMG_DIR, `${base}.jpg`), full);
  writeFileSync(join(PRODUCT_IMG_DIR, `${base}-sm.jpg`), thumb);
  return `/uploads/products/${base}.jpg`;
}

function deleteProductImage(imageUrl) {
  if (!imageUrl || !imageUrl.startsWith('/uploads/products/')) return;
  const file = imageUrl.replace('/uploads/products/', '');
  if (!/^[\w-]+\.jpg$/.test(file)) return; // захист від ../
  for (const name of [file, file.replace('.jpg', '-sm.jpg')]) {
    const path = join(PRODUCT_IMG_DIR, name);
    if (existsSync(path)) unlinkSync(path);
  }
}

function validateProductBody(body) {
  const name = String(body.name || '').trim();
  const description = String(body.description || '').trim();
  const unit = String(body.unit || '').trim();
  const price = Number(body.price);
  const categoryId = Number(body.categoryId);

  if (!name || name.length > 80) throw new Error('Назва: від 1 до 80 символів');
  if (description.length > 300) throw new Error('Опис: максимум 300 символів');
  if (unit.length > 30) throw new Error('Вага/обʼєм: максимум 30 символів');
  if (!Number.isInteger(price) || price < 1 || price > 100000) {
    throw new Error('Ціна: ціле число від 1 до 100000');
  }
  if (!db.prepare('SELECT 1 FROM categories WHERE id = ?').get(categoryId)) {
    throw new Error('Оберіть категорію');
  }
  return {
    name,
    description,
    unit,
    price,
    categoryId,
    isNew: body.isNew ? 1 : 0,
    isSpicy: body.isSpicy ? 1 : 0,
    inStock: body.inStock === false ? 0 : 1,
  };
}

// ---------- Маршрути ----------
adminRouter.get('/me', (req, res) => res.json({ ok: true }));

adminRouter.get('/categories', (req, res) => {
  const rows = db.prepare('SELECT id, section, name FROM categories ORDER BY section, sort_order, id').all();
  res.json(rows);
});

adminRouter.post('/categories', (req, res) => {
  const name = String(req.body?.name || '').trim();
  const section = req.body?.section;
  if (!name || name.length > 40) return res.status(400).json({ error: 'Назва категорії: 1–40 символів' });
  if (section !== 'kitchen' && section !== 'bar') {
    return res.status(400).json({ error: 'Розділ: кухня або бар' });
  }
  const max = db.prepare('SELECT COALESCE(MAX(sort_order), 0) AS m FROM categories WHERE section = ?').get(section).m;
  const info = db
    .prepare('INSERT INTO categories (section, name, sort_order) VALUES (?, ?, ?)')
    .run(section, name, max + 1);
  res.status(201).json({ id: Number(info.lastInsertRowid), section, name });
});

adminRouter.get('/products', (req, res) => {
  const rows = db.prepare(`${SELECT_PRODUCT} ORDER BY CASE c.section WHEN 'kitchen' THEN 0 ELSE 1 END, c.sort_order, p.id DESC`).all();
  res.json(rows.map(toAdminProduct));
});

adminRouter.post('/products', (req, res) => {
  let imageUrl = '';
  try {
    const v = validateProductBody(req.body || {});
    if (req.body.image) imageUrl = saveProductImage(req.body.image);
    const info = db
      .prepare(
        `INSERT INTO products (category_id, name, description, price, unit, image_url, is_new, is_spicy, in_stock)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(v.categoryId, v.name, v.description, v.price, v.unit, imageUrl, v.isNew, v.isSpicy, v.inStock);
    const row = db.prepare(`${SELECT_PRODUCT} WHERE p.id = ?`).get(Number(info.lastInsertRowid));
    res.status(201).json(toAdminProduct(row));
  } catch (err) {
    deleteProductImage(imageUrl);
    res.status(400).json({ error: err.message });
  }
});

adminRouter.put('/products/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Товар не знайдено' });

  let newImageUrl = null;
  try {
    const v = validateProductBody(req.body || {});
    let imageUrl = existing.image_url;
    if (req.body.image) {
      newImageUrl = saveProductImage(req.body.image);
      imageUrl = newImageUrl;
    } else if (req.body.removeImage) {
      imageUrl = '';
    }
    db.prepare(
      `UPDATE products SET category_id = ?, name = ?, description = ?, price = ?, unit = ?,
         image_url = ?, is_new = ?, is_spicy = ?, in_stock = ? WHERE id = ?`
    ).run(v.categoryId, v.name, v.description, v.price, v.unit, imageUrl, v.isNew, v.isSpicy, v.inStock, id);
    if (imageUrl !== existing.image_url) deleteProductImage(existing.image_url);
    const row = db.prepare(`${SELECT_PRODUCT} WHERE p.id = ?`).get(id);
    res.json(toAdminProduct(row));
  } catch (err) {
    if (newImageUrl) deleteProductImage(newImageUrl);
    res.status(400).json({ error: err.message });
  }
});

adminRouter.delete('/products/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Товар не знайдено' });
  const used = db.prepare('SELECT COUNT(*) AS n FROM order_items WHERE product_id = ?').get(id).n;
  if (used > 0) {
    return res.status(409).json({
      error: 'Цей товар є в оформлених замовленнях — видалити не можна. Зніміть «Є в наявності», і він зникне з замовлень.',
    });
  }
  db.prepare('DELETE FROM products WHERE id = ?').run(id);
  deleteProductImage(existing.image_url);
  res.json({ ok: true });
});
