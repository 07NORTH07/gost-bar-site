import { Router } from 'express';
import { randomBytes } from 'node:crypto';
import { db, shortStreetName } from '../database/db.js';

export const ordersRouter = Router();

// Тримаємо константи тут же — фронтенд дублює їх лише для миттєвого
// відображення прогрес-бару, але фінальний розрахунок завжди тут, на бекенді.
export const DELIVERY_FEE = 60;
export const FREE_DELIVERY_THRESHOLD = 500;

// Мобільні коди операторів України (після +380).
const UA_MOBILE_CODES = new Set([
  '39', '50', '63', '66', '67', '68', '73', '89', '91', '92', '93', '94', '95', '96', '97', '98', '99',
]);

// Повертає номер у форматі +380XXXXXXXXX або null, якщо номер некоректний.
export function normalizeUaPhone(input) {
  let digits = String(input || '').replace(/\D/g, '');
  if (digits.startsWith('380')) digits = digits.slice(3);
  else if (digits.startsWith('80')) digits = digits.slice(2);
  else if (digits.startsWith('0')) digits = digits.slice(1);
  if (!/^\d{9}$/.test(digits)) return null;
  if (!UA_MOBILE_CODES.has(digits.slice(0, 2))) return null;
  return `+380${digits}`;
}

// Номер будинку: 12, 12А, 12/3, 12-б, 5 корп. 2 — без довільного тексту.
const HOUSE_RE = /^\d{1,4}([ -]?[А-ЩЬЮЯҐЄІЇа-щьюяґєії])?(\/\d{1,3})?( ?(корп\.|к\.) ?\d{1,2})?$/;
const SHORT_FIELD_RE = /^[0-9А-ЩЬЮЯҐЄІЇа-щьюяґєії\-\/ ]{1,10}$/;

function toClientOrder(row, items) {
  return {
    orderId: row.id,
    createdAt: row.created_at,
    status: row.status,
    deliveryType: row.delivery_type,
    address: row.address,
    paymentMethod: row.payment_method,
    deliveryCost: row.delivery_cost,
    totalAmount: row.total_amount,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    comment: row.comment,
    items,
  };
}

// POST /api/orders — оформлення замовлення.
// Body: { items: [{productId, quantity}], deliveryType, street, house, apartment,
//         entrance, floor, intercom, paymentMethod ('card'|'cash'),
//         customerName, customerPhone, comment, promoCode }
ordersRouter.post('/', (req, res) => {
  const {
    items,
    deliveryType,
    street,
    house,
    apartment,
    entrance,
    floor,
    intercom,
    paymentMethod,
    customerName,
    customerPhone,
    comment,
    promoCode,
  } = req.body || {};

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Кошик порожній' });
  }
  if (items.length > 50) {
    return res.status(400).json({ error: 'Забагато позицій у замовленні' });
  }
  if (deliveryType !== 'delivery' && deliveryType !== 'pickup') {
    return res.status(400).json({ error: 'Вкажіть спосіб отримання' });
  }

  // Доставка — лише по Івано-Франківську: вулиця має бути зі списку streets.
  let addressText = '';
  const addr = { street: '', house: '', apartment: '', entrance: '', floor: '', intercom: '' };
  if (deliveryType === 'delivery') {
    const streetRow = db.prepare('SELECT name FROM streets WHERE name = ?').get(String(street || '').trim());
    if (!streetRow) {
      return res.status(400).json({ error: 'Оберіть вулицю Івано-Франківська зі списку підказок' });
    }
    const houseValue = String(house || '').trim();
    if (!HOUSE_RE.test(houseValue)) {
      return res.status(400).json({ error: 'Вкажіть коректний номер будинку, наприклад 12 або 12А' });
    }
    for (const [key, value] of Object.entries({ apartment, entrance, floor, intercom })) {
      const v = String(value || '').trim();
      if (v && !SHORT_FIELD_RE.test(v)) {
        return res.status(400).json({ error: 'Перевірте квартиру, під’їзд, поверх і домофон' });
      }
      addr[key] = v;
    }
    addr.street = streetRow.name;
    addr.house = houseValue;
    addressText =
      `Івано-Франківськ, ${shortStreetName(streetRow.name)}, ${houseValue}` +
      (addr.apartment ? `, кв. ${addr.apartment}` : '') +
      (addr.entrance ? `, під’їзд ${addr.entrance}` : '') +
      (addr.floor ? `, поверх ${addr.floor}` : '') +
      (addr.intercom ? `, домофон ${addr.intercom}` : '');
  }

  if (!['card', 'cash'].includes(paymentMethod)) {
    return res.status(400).json({ error: 'Вкажіть спосіб оплати: картка або готівка' });
  }
  if (!(customerName && customerName.trim())) {
    return res.status(400).json({ error: 'Вкажіть імʼя' });
  }
  const phone = normalizeUaPhone(customerPhone);
  if (!phone) {
    return res.status(400).json({ error: 'Вкажіть коректний український номер: +380 XX XXX XX XX' });
  }

  // Ніколи не довіряємо цінам/кількостям з клієнта — підтягуємо реальні
  // товари з БД за їхніми id і рахуємо суму на бекенді.
  const ids = [...new Set(items.map((i) => Number(i.productId)).filter(Number.isFinite))];
  if (ids.length === 0) {
    return res.status(400).json({ error: 'Кошик порожній' });
  }
  const placeholders = ids.map(() => '?').join(',');
  const dbProducts = db.prepare(`SELECT * FROM products WHERE id IN (${placeholders})`).all(...ids);
  const productMap = new Map(dbProducts.map((p) => [p.id, p]));

  let subtotal = 0;
  const preparedItems = [];
  for (const raw of items) {
    const product = productMap.get(Number(raw.productId));
    const quantity = Math.max(1, Math.min(99, Math.trunc(Number(raw.quantity)) || 1));
    if (!product || !product.in_stock) {
      return res.status(400).json({ error: `Товар недоступний: ${raw.productId}` });
    }
    subtotal += product.price * quantity;
    preparedItems.push({ productId: product.id, quantity, price: product.price });
  }

  let discountPercent = 0;
  let appliedPromo = null;
  if (promoCode && promoCode.trim()) {
    const promo = db
      .prepare('SELECT * FROM promo_codes WHERE code = ? AND active = 1')
      .get(promoCode.trim().toUpperCase());
    if (promo) {
      discountPercent = promo.discount_percent;
      appliedPromo = promo.code;
    }
  }
  const discount = Math.round((subtotal * discountPercent) / 100);
  const afterDiscount = subtotal - discount;
  const deliveryCost =
    deliveryType === 'delivery' && afterDiscount < FREE_DELIVERY_THRESHOLD ? DELIVERY_FEE : 0;
  const total = afterDiscount + deliveryCost;

  const insertOrder = db.prepare(`
    INSERT INTO orders
      (delivery_type, address, street, house, apartment, entrance, floor, intercom,
       payment_method, payment_status, delivery_cost, total_amount, customer_name, customer_phone, comment,
       public_token)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  // 24 випадкових байти = 192 біти: перебрати неможливо.
  const publicToken = randomBytes(24).toString('base64url');
  const info = insertOrder.run(
    deliveryType,
    addressText,
    addr.street,
    addr.house,
    addr.apartment,
    addr.entrance,
    addr.floor,
    addr.intercom,
    paymentMethod,
    paymentMethod === 'card' ? 'paid' : 'pending',
    deliveryCost,
    total,
    customerName.trim().slice(0, 80),
    phone,
    (comment || '').trim().slice(0, 500),
    publicToken
  );
  const orderId = Number(info.lastInsertRowid);

  const insertItem = db.prepare(
    'INSERT INTO order_items (order_id, product_id, quantity, price_at_order) VALUES (?, ?, ?, ?)'
  );
  for (const item of preparedItems) {
    insertItem.run(orderId, item.productId, item.quantity, item.price);
  }

  res.status(201).json({
    orderId,
    orderToken: publicToken,
    subtotal,
    discount,
    discountPercent,
    promoCode: appliedPromo,
    deliveryCost,
    total,
  });
});

// GET /api/orders/:token — підтвердження замовлення (номер + склад) за приватним
// токеном, який клієнт отримав у відповідь на POST. Номер замовлення (id)
// тут не приймаємо: він іде підряд і його можна перебрати.
ordersRouter.get('/:token', (req, res) => {
  const token = String(req.params.token || '');
  if (!/^[A-Za-z0-9_-]{32}$/.test(token)) {
    return res.status(404).json({ error: 'Замовлення не знайдено' });
  }
  const order = db.prepare('SELECT * FROM orders WHERE public_token = ?').get(token);
  if (!order) return res.status(404).json({ error: 'Замовлення не знайдено' });

  const items = db
    .prepare(
      `SELECT oi.quantity, oi.price_at_order, p.name, p.unit
       FROM order_items oi
       JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id = ?`
    )
    .all(order.id)
    .map((row) => ({
      name: row.name,
      unit: row.unit,
      quantity: row.quantity,
      price: row.price_at_order,
    }));

  res.json(toClientOrder(order, items));
});
