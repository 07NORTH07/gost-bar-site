import { Router } from 'express';
import { db } from '../database/db.js';

export const promoRouter = Router();

// GET /api/promo/:code — перевірка промокоду (для миттєвого фідбеку в сайдбарі,
// не чекаючи оформлення замовлення). Фінальна перевірка все одно повторюється
// в POST /api/orders.
promoRouter.get('/:code', (req, res) => {
  const code = String(req.params.code || '').trim().toUpperCase();
  if (!code) return res.status(400).json({ error: 'Введіть промокод' });

  const promo = db.prepare('SELECT * FROM promo_codes WHERE code = ? AND active = 1').get(code);
  if (!promo) return res.status(404).json({ error: 'Промокод не знайдено або він більше не діє' });

  res.json({ code: promo.code, discountPercent: promo.discount_percent });
});
