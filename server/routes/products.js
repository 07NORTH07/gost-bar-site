import { Router } from 'express';
import { db } from '../database/db.js';
import { clientId } from '../middleware/client-id.js';

export const productsRouter = Router();

// Усі відповіді залежать від cookie відвідувача (поле liked) — не кешуємо.
productsRouter.use(clientId);
productsRouter.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

// Підзапит «чи вподобав цей відвідувач товар»; параметр — req.clientId.
const LIKED_SQL = `EXISTS (SELECT 1 FROM product_likes l WHERE l.product_id = p.id AND l.client_id = ?) AS liked`;

function toClientProduct(row) {
  return {
    id: row.id,
    categoryId: row.category_id,
    name: row.name,
    description: row.description,
    price: row.price,
    unit: row.unit,
    imageUrl: row.image_url,
    isNew: !!row.is_new,
    isSpicy: !!row.is_spicy,
    likesCount: row.likes_count,
    liked: !!row.liked,
    inStock: !!row.in_stock,
  };
}

// GET /api/products?section=kitchen|bar&categoryId=1&q=пошук
productsRouter.get('/', (req, res) => {
  const { section, categoryId, q } = req.query;

  const clauses = [];
  const params = [];

  if (section === 'kitchen' || section === 'bar') {
    clauses.push('c.section = ?');
    params.push(section);
  }
  if (categoryId) {
    clauses.push('p.category_id = ?');
    params.push(Number(categoryId));
  }
  if (q && q.trim()) {
    clauses.push('p.name LIKE ?');
    params.push(`%${q.trim()}%`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = db
    .prepare(
      `SELECT p.*, ${LIKED_SQL} FROM products p
       JOIN categories c ON c.id = p.category_id
       ${where}
       ORDER BY p.id`
    )
    .all(req.clientId, ...params);

  res.json(rows.map(toClientProduct));
});

// GET /api/products/:id — деталі одного товару (для модального вікна)
productsRouter.get('/:id', (req, res) => {
  const row = db
    .prepare(`SELECT p.*, ${LIKED_SQL} FROM products p WHERE p.id = ?`)
    .get(req.clientId, Number(req.params.id));
  if (!row) return res.status(404).json({ error: 'Товар не знайдено' });
  res.json(toClientProduct(row));
});

// PUT/DELETE /api/products/:id/like — поставити / зняти сердечко.
// Саме PUT і DELETE, а не «перемикач»: повторний запит (подвійний клік,
// ретрай) дає той самий результат і не розʼїжджає лічильник.
// Відповідь: { liked, likesCount } — фронтенд показує актуальне число.
function setLike(req, res, wantLiked) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(404).json({ error: 'Товар не знайдено' });
  if (!db.prepare('SELECT 1 FROM products WHERE id = ?').get(id)) {
    return res.status(404).json({ error: 'Товар не знайдено' });
  }

  db.exec('BEGIN IMMEDIATE');
  try {
    if (wantLiked) {
      const r = db
        .prepare('INSERT OR IGNORE INTO product_likes (product_id, client_id) VALUES (?, ?)')
        .run(id, req.clientId);
      if (r.changes === 1) db.prepare('UPDATE products SET likes_count = likes_count + 1 WHERE id = ?').run(id);
    } else {
      const r = db
        .prepare('DELETE FROM product_likes WHERE product_id = ? AND client_id = ?')
        .run(id, req.clientId);
      if (r.changes === 1) {
        db.prepare('UPDATE products SET likes_count = MAX(0, likes_count - 1) WHERE id = ?').run(id);
      }
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  const likesCount = db.prepare('SELECT likes_count FROM products WHERE id = ?').get(id).likes_count;
  res.json({ liked: wantLiked, likesCount });
}

productsRouter.put('/:id/like', (req, res) => setLike(req, res, true));
productsRouter.delete('/:id/like', (req, res) => setLike(req, res, false));
