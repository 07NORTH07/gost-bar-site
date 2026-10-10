// Тонка обгортка над fetch. Тримаємо окремо від app.js,
// щоб було легко замінити на реальні ендпоінти пізніше.
const api = {
  async getCategories(section) {
    const res = await fetch(`/api/categories?section=${section}`);
    if (!res.ok) throw new Error('Не вдалося завантажити категорії');
    return res.json();
  },

  async getProducts({ section, categoryId, q } = {}) {
    const params = new URLSearchParams();
    if (section) params.set('section', section);
    if (categoryId) params.set('categoryId', categoryId);
    if (q) params.set('q', q);
    const res = await fetch(`/api/products?${params.toString()}`);
    if (!res.ok) throw new Error('Не вдалося завантажити товари');
    return res.json();
  },

  async getProduct(id) {
    const res = await fetch(`/api/products/${id}`);
    if (!res.ok) throw new Error('Товар не знайдено');
    return res.json();
  },

  // Сердечко: PUT — поставити, DELETE — зняти (ідемпотентно). Відповідь: { liked, likesCount }.
  // Відвідувача сервер впізнає за cookie, нічого передавати не треба.
  async setLike(productId, liked) {
    const res = await fetch(`/api/products/${productId}/like`, { method: liked ? 'PUT' : 'DELETE' });
    let data = null;
    try {
      data = await res.json();
    } catch {
      /* не-JSON відповідь (напр. збій проксі) — повідомлення нижче */
    }
    if (!res.ok) throw new Error((data && data.error) || 'Не вдалося зберегти вподобання');
    return data;
  },

  async checkPromo(code) {
    const res = await fetch(`/api/promo/${encodeURIComponent(code)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Промокод недійсний');
    return data;
  },

  async searchStreets(q, signal) {
    const res = await fetch(`/api/streets?q=${encodeURIComponent(q)}`, { signal });
    if (!res.ok) return [];
    return res.json();
  },

  async createOrder(payload) {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Не вдалося оформити замовлення');
    return data;
  },
};
