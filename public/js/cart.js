// Кошик: стан у localStorage + просте pub/sub, щоб сайдбар, мобільна панель
// і checkout-drawer завжди показували однакові дані без ручної синхронізації.
const CART_STORAGE_KEY = 'gostbar_cart_v1';

// Дублюємо константи доставки з бекенду (server/routes/orders.js) — тут вони
// лише для миттєвого прогрес-бару в UI, фінальний рахунок завжди перевіряє сервер.
const DELIVERY_FEE = 60;
const FREE_DELIVERY_THRESHOLD = 500;

function readCartFromStorage() {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCartToStorage(items) {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // сховище недоступне (приватний режим / квота) — просто не зберігаємо
  }
}

const cart = {
  items: readCartFromStorage(),
  _listeners: [],

  // Компоненти підписуються, щоб перемалюватись при будь-якій зміні кошика.
  subscribe(fn) {
    this._listeners.push(fn);
  },

  _emit() {
    writeCartToStorage(this.items);
    this._listeners.forEach((fn) => fn(this.items));
  },

  add(product, quantity = 1) {
    const qty = Math.max(1, Math.min(99, Math.trunc(quantity) || 1));
    const existing = this.items.find((i) => i.productId === product.id);
    if (existing) {
      existing.quantity = Math.min(99, existing.quantity + qty);
    } else {
      this.items.push({
        productId: product.id,
        name: product.name,
        price: product.price,
        unit: product.unit,
        imageUrl: product.imageUrl || '',
        quantity: qty,
      });
    }
    this._emit();
  },

  setQuantity(productId, quantity) {
    const item = this.items.find((i) => i.productId === productId);
    if (!item) return;
    if (quantity <= 0) {
      this.remove(productId);
      return;
    }
    item.quantity = Math.min(99, Math.trunc(quantity));
    this._emit();
  },

  increment(productId, delta) {
    const item = this.items.find((i) => i.productId === productId);
    if (!item) return;
    this.setQuantity(productId, item.quantity + delta);
  },

  remove(productId) {
    this.items = this.items.filter((i) => i.productId !== productId);
    this._emit();
  },

  clear() {
    this.items = [];
    this._emit();
  },

  isEmpty() {
    return this.items.length === 0;
  },

  getCount() {
    return this.items.reduce((sum, i) => sum + i.quantity, 0);
  },

  getSubtotal() {
    return this.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  },

  // Скільки ще треба докласти в кошик до безкоштовної доставки (0, якщо вже досягнуто).
  getRemainingForFreeDelivery(discountedSubtotal) {
    const amount = discountedSubtotal ?? this.getSubtotal();
    return Math.max(0, FREE_DELIVERY_THRESHOLD - amount);
  },
};
