-- Схема БД бару "ГОСТ". SQLite.
-- section у categories: 'kitchen' (Кухня) або 'bar' (Бар)

CREATE TABLE IF NOT EXISTS categories (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  section     TEXT NOT NULL CHECK (section IN ('kitchen', 'bar')),
  name        TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS products (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id   INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT DEFAULT '',
  price         INTEGER NOT NULL,              -- ціна в гривнях (цілі), без копійок
  unit          TEXT DEFAULT '',                -- напр. "180 г", "1 шт"
  image_url     TEXT DEFAULT '',
  is_new        INTEGER NOT NULL DEFAULT 0,     -- 0/1
  is_spicy      INTEGER NOT NULL DEFAULT 0,     -- 0/1
  likes_count   INTEGER NOT NULL DEFAULT 0,
  in_stock      INTEGER NOT NULL DEFAULT 1      -- 0/1 (кількість не трекаємо окремо, як у ТЗ)
);

CREATE TABLE IF NOT EXISTS promo_codes (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  code              TEXT NOT NULL UNIQUE,
  discount_percent  INTEGER NOT NULL,
  active            INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS orders (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  status          TEXT NOT NULL DEFAULT 'new',        -- new / paid / preparing / done / cancelled
  delivery_type   TEXT NOT NULL,                       -- 'delivery' / 'pickup'
  address         TEXT DEFAULT '',
  payment_method  TEXT NOT NULL,                       -- 'card' / 'cash'
  payment_status  TEXT NOT NULL DEFAULT 'pending',      -- pending / paid
  delivery_cost   INTEGER NOT NULL DEFAULT 0,
  total_amount    INTEGER NOT NULL,
  customer_name   TEXT NOT NULL,
  customer_phone  TEXT NOT NULL,
  comment         TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS order_items (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id        INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id      INTEGER NOT NULL REFERENCES products(id),
  quantity        INTEGER NOT NULL,
  price_at_order  INTEGER NOT NULL
);

-- Вподобання (сердечка): один анонімний клієнт — одне сердечко на товар.
-- client_id — випадковий ідентифікатор з cookie `gost_cid` (видає сервер).
-- products.likes_count лишається денормалізованим лічильником (у ньому ще є
-- стартові значення з seed.js), тому ставимо/знімаємо його разом із рядком тут.
CREATE TABLE IF NOT EXISTS product_likes (
  product_id  INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  client_id   TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (product_id, client_id)
);

-- Вулиці Івано-Франківська для підказок в адресі доставки.
-- name_search — назва в нижньому регістрі (SQLite не вміє lower() для кирилиці).
CREATE TABLE IF NOT EXISTS streets (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT NOT NULL UNIQUE,      -- повна назва: "вулиця Сахарова"
  short_name   TEXT NOT NULL,             -- для відображення: "вул. Сахарова"
  name_search  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_streets_search ON streets(name_search);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_categories_section ON categories(section, sort_order);
