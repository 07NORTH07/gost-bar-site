// Дублюємо константи доставки з бекенду (server/routes/orders.js) — лише
// для миттєвого відображення в UI (прогрес-бар, підсумок доставки).
// Фінальний розрахунок і перевірку завжди виконує сервер у POST /api/orders.

// Заглушка для товарів без фото й для фото, що не завантажилися.
const PLACEHOLDER_IMG = '/assets/placeholders/kitchen.svg';
// Заглушка для розділу «Бар» — сумна кружка пива.
const PLACEHOLDER_BAR_IMG = '/assets/placeholders/bar.svg';
// Обирає заглушку за поточним розділом (кухня — тарілка, бар — кружка).
function placeholderFor(section) {
  return section === 'bar' ? PLACEHOLDER_BAR_IMG : PLACEHOLDER_IMG;
}

// Якщо фото товару не завантажилося (файл зник, обрив мережі) — підставляємо
// заглушку замість зламаного значка. Подія error не спливає, тому слухаємо її
// на capture-фазі; inline onerror заборонений політикою CSP (helmet).
document.addEventListener('error', (e) => {
  const img = e.target;
  if (!(img instanceof HTMLImageElement)) return;
  if (img.dataset.fallback || img.src.endsWith(PLACEHOLDER_IMG) || img.src.endsWith(PLACEHOLDER_BAR_IMG)) return;
  img.dataset.fallback = '1';
  img.alt = '';
  img.src = placeholderFor(state.section);
}, true);

const state = {
  section: 'kitchen',
  categoryId: null,
  query: '',
  products: [],
  categories: [],
  paymentMethod: 'card',
  deliveryType: 'delivery',
  promo: { code: null, discountPercent: 0 },
  cardFilled: false,
  street: null, // обрана зі списку вулиця: { name, label }
};

const els = {
  catStrip: document.getElementById('catStrip'),
  catalog: document.getElementById('catalog'),
  searchInput: document.getElementById('searchInput'),
  sectionBtns: document.querySelectorAll('.section-toggle__btn'),
  catArrowLeft: document.querySelector('.cat-arrow--left'),
  catArrowRight: document.querySelector('.cat-arrow--right'),

  modalOverlay: document.getElementById('modalOverlay'),
  modalClose: document.getElementById('modalClose'),
  modalImage: document.getElementById('modalImage'),
  modalBadges: document.getElementById('modalBadges'),
  modalTitle: document.getElementById('modalTitle'),
  modalUnit: document.getElementById('modalUnit'),
  modalLike: document.getElementById('modalLike'),
  modalDesc: document.getElementById('modalDesc'),
  modalPrice: document.getElementById('modalPrice'),
  modalAdd: document.getElementById('modalAdd'),
  qtyValue: document.getElementById('qtyValue'),
  qtyMinus: document.getElementById('qtyMinus'),
  qtyPlus: document.getElementById('qtyPlus'),

  // Кошик у сайдбарі
  cartFlightTarget: document.getElementById('cartFlightTarget'),
  cartCountBadge: document.getElementById('cartCountBadge'),
  cartEmptyMsg: document.getElementById('cartEmptyMsg'),
  cartItemsList: document.getElementById('cartItemsList'),
  freeShippingBlock: document.getElementById('freeShippingBlock'),
  freeShippingFill: document.getElementById('freeShippingFill'),
  freeShippingText: document.getElementById('freeShippingText'),
  upsellBlock: document.getElementById('upsellBlock'),
  upsellList: document.getElementById('upsellList'),
  cartSummary: document.getElementById('cartSummary'),
  cartSubtotalValue: document.getElementById('cartSubtotalValue'),
  cartDiscountRow: document.getElementById('cartDiscountRow'),
  cartDiscountValue: document.getElementById('cartDiscountValue'),
  cartTotalValue: document.getElementById('cartTotalValue'),
  openCheckoutBtn: document.getElementById('openCheckoutBtn'),
  openCartPopupBtn: document.getElementById('openCartPopupBtn'),
  openPaymentPopupBtn: document.getElementById('openPaymentPopupBtn'),

  // Доставка / оплата / промокод у сайдбарі
  deliveryAddressInput: document.getElementById('deliveryAddressInput'),
  promoInput: document.getElementById('promoInput'),
  promoApplyBtn: document.getElementById('promoApplyBtn'),
  promoFeedback: document.getElementById('promoFeedback'),

  // Мобільна панель кошика
  mobileCartBar: document.getElementById('mobileCartBar'),
  mobileCartText: document.getElementById('mobileCartText'),

  // Checkout drawer
  checkoutDrawer: document.getElementById('checkoutDrawer'),
  checkoutClose: document.getElementById('checkoutClose'),
  checkoutFormView: document.getElementById('checkoutFormView'),
  checkoutConfirmView: document.getElementById('checkoutConfirmView'),
  deliveryTypeToggle: document.getElementById('deliveryTypeToggle'),
  checkoutAddressField: document.getElementById('checkoutAddressField'),
  checkoutPickupHint: document.getElementById('checkoutPickupHint'),
  checkoutStreet: document.getElementById('checkoutStreet'),
  checkoutHouse: document.getElementById('checkoutHouse'),
  checkoutApartment: document.getElementById('checkoutApartment'),
  checkoutEntrance: document.getElementById('checkoutEntrance'),
  checkoutFloor: document.getElementById('checkoutFloor'),
  checkoutIntercom: document.getElementById('checkoutIntercom'),
  cashHint: document.getElementById('cashHint'),
  checkoutName: document.getElementById('checkoutName'),
  checkoutPhone: document.getElementById('checkoutPhone'),
  checkoutComment: document.getElementById('checkoutComment'),
  checkoutItemsList: document.getElementById('checkoutItemsList'),
  checkoutSubtotal: document.getElementById('checkoutSubtotal'),
  checkoutDiscountRow: document.getElementById('checkoutDiscountRow'),
  checkoutDiscount: document.getElementById('checkoutDiscount'),
  checkoutDeliveryCost: document.getElementById('checkoutDeliveryCost'),
  checkoutTotal: document.getElementById('checkoutTotal'),
  checkoutError: document.getElementById('checkoutError'),
  checkoutSubmitBtn: document.getElementById('checkoutSubmitBtn'),
  confirmOrderNumber: document.getElementById('confirmOrderNumber'),
  confirmOrderText: document.getElementById('confirmOrderText'),
  checkoutConfirmCloseBtn: document.getElementById('checkoutConfirmCloseBtn'),
  openCardPayBtn: document.getElementById('openCardPayBtn'),

  // Попап каталогу
  catalogPopup: document.getElementById('catalogPopup'),
  catalogPopupClose: document.getElementById('catalogPopupClose'),
  catalogPopupList: document.getElementById('catalogPopupList'),
  catalogPopupEmpty: document.getElementById('catalogPopupEmpty'),
  catalogPopupTotal: document.getElementById('catalogPopupTotal'),
  catalogPopupCheckoutBtn: document.getElementById('catalogPopupCheckoutBtn'),

  // Попап оплати карткою
  paymentPopup: document.getElementById('paymentPopup'),
  paymentPopupClose: document.getElementById('paymentPopupClose'),
  cardVisualNumber: document.getElementById('cardVisualNumber'),
  cardVisualHolder: document.getElementById('cardVisualHolder'),
  cardVisualExpiry: document.getElementById('cardVisualExpiry'),
  cardNumber: document.getElementById('cardNumber'),
  cardExpiry: document.getElementById('cardExpiry'),
  cardCvv: document.getElementById('cardCvv'),
  cardHolder: document.getElementById('cardHolder'),
  paymentError: document.getElementById('paymentError'),
  paymentSubmitBtn: document.getElementById('paymentSubmitBtn'),
  paymentSubmitText: document.getElementById('paymentSubmitText'),
  paymentSuccess: document.getElementById('paymentSuccess'),
  paymentSuccessText: document.getElementById('paymentSuccessText'),
  paymentFormView: document.getElementById('paymentFormView'),
  cardVisualBrand: document.getElementById('cardVisualBrand'),
};

let modalQty = 1;
let activeProduct = null;

// ---------- Рендер каталогу ----------

function renderSkeleton(count = 8) {
  els.catalog.innerHTML = '';
  els.catalog.classList.add('skeleton');
  for (let i = 0; i < count; i++) {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="card__image"></div>
      <div class="card__body">
        <div class="skel-line skel-line--60"></div>
        <div class="skel-line skel-line--40"></div>
      </div>`;
    els.catalog.appendChild(card);
  }
}

function renderCategories() {
  els.catStrip.innerHTML = '';

  const allChip = document.createElement('button');
  allChip.className = 'cat-chip' + (state.categoryId === null ? ' is-active' : '');
  allChip.textContent = 'Усе';
  allChip.addEventListener('click', () => selectCategory(null));
  els.catStrip.appendChild(allChip);

  state.categories.forEach((cat) => {
    const chip = document.createElement('button');
    chip.className = 'cat-chip' + (state.categoryId === cat.id ? ' is-active' : '');
    chip.textContent = cat.name;
    chip.addEventListener('click', () => selectCategory(cat.id));
    els.catStrip.appendChild(chip);
  });
}

function renderProducts() {
  els.catalog.classList.remove('skeleton');
  els.catalog.innerHTML = '';

  if (state.products.length === 0) {
    els.catalog.innerHTML = `<p style="color:var(--text-muted);grid-column:1/-1;">Нічого не знайдено.</p>`;
    return;
  }

  state.products.forEach((p) => {
    const card = document.createElement('article');
    card.className = 'card';
    card.addEventListener('click', () => openModal(p));

    const badges = [];
    if (!p.inStock) badges.push('<span class="badge badge--out">Немає в наявності</span>');
    if (p.isNew) badges.push('<span class="badge badge--new">New</span>');
    if (p.isSpicy) badges.push('<span class="badge badge--spicy">Hot</span>');

    const hasPhoto = !!p.imageUrl;
    const thumb = hasPhoto ? productImageUrl(p.imageUrl, 'thumb') : placeholderFor(state.section);
    if (!p.inStock) card.classList.add('is-sold-out');

    card.innerHTML = `
      <div class="card__image has-img">
        <img src="${escapeHtml(thumb)}" alt="${hasPhoto ? escapeHtml(p.name) : ''}" loading="lazy" decoding="async" width="600" height="450" />
        <div class="card__badges">${badges.join('')}</div>
      </div>
      <div class="card__body">
        <div class="card__name">${escapeHtml(p.name)}</div>
        <div class="card__unit">${escapeHtml(p.unit)}</div>
        <div class="card__desc">${escapeHtml(p.description)}</div>
        <div class="card__footer">
          <span class="card__price">${p.price} ₴</span>
          ${likeButtonHtml(p, 'card__likes')}
          <button class="card__quick-add" type="button" aria-label="Додати «${escapeHtml(p.name)}» в кошик"${p.inStock ? '' : ' disabled'}>+</button>
        </div>
      </div>`;

    card.querySelector('.like-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      toggleLike(p.id);
    });

    const quickAddBtn = card.querySelector('.card__quick-add');
    quickAddBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!p.inStock) return;
      cart.add(p, 1);
      flyToCart(quickAddBtn);
    });

    els.catalog.appendChild(card);
  });
}

// ---------- Вподобання (сердечка) ----------
// Стан (liked + лічильник) приходить із сервера в кожному товарі. Клік оновлює
// інтерфейс одразу, а PUT/DELETE на сервер підтверджує або відкочує.

function likeButtonHtml(p, extraClass = '') {
  return `
    <button class="like-btn ${extraClass}${p.liked ? ' is-liked' : ''}" type="button"
            data-like-id="${p.id}" aria-pressed="${p.liked ? 'true' : 'false'}"
            aria-label="${p.liked ? 'Прибрати з вподобаних' : 'Подобається'}: ${escapeHtml(p.name)}">
      <span class="like-btn__icon" aria-hidden="true">${p.liked ? '♥' : '♡'}</span>
      <span class="like-btn__count">${p.likesCount}</span>
    </button>`;
}

// Перемальовує всі кнопки цього товару (картка + модалка).
function syncLikeButtons(p) {
  document.querySelectorAll(`[data-like-id="${p.id}"]`).forEach((btn) => {
    btn.classList.toggle('is-liked', p.liked);
    btn.setAttribute('aria-pressed', p.liked ? 'true' : 'false');
    btn.setAttribute(
      'aria-label',
      `${p.liked ? 'Прибрати з вподобаних' : 'Подобається'}: ${p.name}`
    );
    btn.querySelector('.like-btn__icon').textContent = p.liked ? '♥' : '♡';
    btn.querySelector('.like-btn__count').textContent = String(p.likesCount);
  });
}

// Записує стан у state.products і в відкриту модалку (там може бути той самий
// товар, але інший обʼєкт, якщо каталог встиг перезавантажитись).
function applyLikeState(id, liked, likesCount) {
  const targets = [state.products.find((x) => x.id === id), activeProduct && activeProduct.id === id ? activeProduct : null];
  targets.forEach((t) => {
    if (!t) return;
    t.liked = liked;
    t.likesCount = Math.max(0, likesCount);
    syncLikeButtons(t);
  });
}

const likesInFlight = new Set();

async function toggleLike(id) {
  const p = state.products.find((x) => x.id === id) || (activeProduct && activeProduct.id === id ? activeProduct : null);
  if (!p || likesInFlight.has(id)) return;
  likesInFlight.add(id);

  const before = { liked: p.liked, likesCount: p.likesCount };
  const wantLiked = !before.liked;
  applyLikeState(id, wantLiked, before.likesCount + (wantLiked ? 1 : -1));
  document.querySelectorAll(`[data-like-id="${id}"]`).forEach((btn) => {
    btn.classList.remove('is-pop');
    void btn.offsetWidth; // перезапуск CSS-анімації
    if (wantLiked) btn.classList.add('is-pop');
  });

  try {
    const result = await api.setLike(id, wantLiked);
    applyLikeState(id, result.liked, result.likesCount);
  } catch (err) {
    applyLikeState(id, before.liked, before.likesCount);
    showToast(err.message, 'error');
  } finally {
    likesInFlight.delete(id);
  }
}

// Фото товару: у БД лежить повний файл /uploads/products/x.jpg, поруч — x-sm.jpg
// (легша версія для карток, щоб на телефоні не тягнути зайві мегабайти).
function productImageUrl(imageUrl, size = 'full') {
  if (!imageUrl) return '';
  return size === 'thumb' ? imageUrl.replace(/\.jpg$/, '-sm.jpg') : imageUrl;
}

// Екранує і текст, і значення атрибутів (alt="…", aria-label="…"): лапки теж.
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ---------- Дані каталогу ----------

async function loadCategories() {
  state.categories = await api.getCategories(state.section);
  renderCategories();
}

async function loadProducts() {
  renderSkeleton();
  try {
    state.products = await api.getProducts({
      section: state.section,
      categoryId: state.query ? null : state.categoryId,
      q: state.query || undefined,
    });
  } catch (err) {
    els.catalog.classList.remove('skeleton');
    els.catalog.innerHTML = `<p style="color:var(--text-muted);grid-column:1/-1;">${err.message}</p>`;
    return;
  }
  renderProducts();
  renderUpsell();
}

// ---------- Дії користувача: каталог/фільтри ----------

function selectSection(section) {
  if (section === state.section) return;
  state.section = section;
  state.categoryId = null;
  state.query = '';
  els.searchInput.value = '';

  els.sectionBtns.forEach((btn) => {
    const isActive = btn.dataset.section === section;
    btn.classList.toggle('is-active', isActive);
    btn.setAttribute('aria-selected', String(isActive));
  });

  loadCategories();
  loadProducts();
}

function selectCategory(categoryId) {
  state.categoryId = categoryId;
  renderCategories();
  loadProducts();
}

let searchTimer = null;
function onSearchInput(e) {
  clearTimeout(searchTimer);
  const value = e.target.value;
  searchTimer = setTimeout(() => {
    state.query = value.trim();
    renderCategories();
    loadProducts();
  }, 300);
}

// ---------- Модальне вікно товару ----------

function openModal(product) {
  activeProduct = product;
  modalQty = 1;
  els.qtyValue.textContent = '1';

  const hasPhoto = !!product.imageUrl;
  const fullImg = hasPhoto ? productImageUrl(product.imageUrl) : placeholderFor(state.section);
  els.modalImage.classList.add('has-img');
  els.modalImage.innerHTML =
    `<img src="${escapeHtml(fullImg)}" alt="${hasPhoto ? escapeHtml(product.name) : ''}" decoding="async" />`;
  els.modalAdd.disabled = !product.inStock;
  els.modalBadges.innerHTML = [
    product.isNew ? '<span class="badge badge--new">New</span>' : '',
    product.isSpicy ? '<span class="badge badge--spicy">Hot</span>' : '',
  ].join('');
  els.modalTitle.textContent = product.name;
  els.modalUnit.textContent = product.unit;
  els.modalDesc.textContent = product.description || '';
  els.modalLike.dataset.likeId = String(product.id);
  syncLikeButtons(product);
  updateModalPrice();

  els.modalOverlay.hidden = false;
}

function closeModal() {
  els.modalOverlay.hidden = true;
  activeProduct = null;
}

function updateModalPrice() {
  if (!activeProduct) return;
  els.modalPrice.textContent = `${activeProduct.price * modalQty} ₴`;
}

function changeQty(delta) {
  modalQty = Math.max(1, Math.min(99, modalQty + delta));
  els.qtyValue.textContent = String(modalQty);
  updateModalPrice();
}

// ---------- Toast ----------

function showToast(text, kind = 'info') {
  const toast = document.createElement('div');
  toast.textContent = text;
  const bg = kind === 'success' ? '#3fa46a' : kind === 'error' ? '#E0664C' : 'var(--card)';
  const color = kind === 'info' ? 'var(--text)' : '#fff';
  toast.style.cssText = `
    position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
    background: ${bg}; border: 1px solid var(--border); color: ${color};
    padding: 12px 20px; border-radius: 999px; font-size: 13px; z-index: 200;
    animation: fadeIn 200ms ease-out; box-shadow: 0 8px 24px rgba(0,0,0,0.4);
  `;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.transition = 'opacity 250ms ease-out, transform 250ms ease-out';
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(10px)';
    setTimeout(() => toast.remove(), 250);
  }, 2200);
}

// ---------- Утиліти: анімації ----------

function animateNumberTo(el, toValue) {
  const from = Number(el.dataset.value || 0);
  el.dataset.value = String(toValue);
  if (from === toValue) {
    el.textContent = `${toValue} ₴`;
    return;
  }
  const duration = 350;
  const start = performance.now();
  function step(now) {
    const progress = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    const value = Math.round(from + (toValue - from) * eased);
    el.textContent = `${value} ₴`;
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function currentCartFlightTarget() {
  const isCompactLayout = window.innerWidth <= 1199;
  if (isCompactLayout && !els.mobileCartBar.hidden) return els.mobileCartBar;
  return els.cartFlightTarget;
}

function flyToCart(startEl) {
  if (!startEl) return;
  const target = currentCartFlightTarget();
  if (!target) return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    pulseCartIcon();
    return;
  }

  const startRect = startEl.getBoundingClientRect();
  const endRect = target.getBoundingClientRect();

  const dot = document.createElement('div');
  dot.className = 'fly-dot';
  dot.style.left = `${startRect.left + startRect.width / 2 - 7}px`;
  dot.style.top = `${startRect.top + startRect.height / 2 - 7}px`;
  document.body.appendChild(dot);

  const dx = endRect.left + endRect.width / 2 - (startRect.left + startRect.width / 2);
  const dy = endRect.top + endRect.height / 2 - (startRect.top + startRect.height / 2);

  const animation = dot.animate(
    [
      { transform: 'translate(0, 0) scale(1)', opacity: 1, offset: 0 },
      { transform: `translate(${dx * 0.5}px, ${dy - 50}px) scale(0.75)`, opacity: 1, offset: 0.6 },
      { transform: `translate(${dx}px, ${dy}px) scale(0.15)`, opacity: 0.5, offset: 1 },
    ],
    { duration: 550, easing: 'cubic-bezier(.3,.6,.4,1)' }
  );
  animation.onfinish = () => {
    dot.remove();
    pulseCartIcon();
  };
}

function pulseCartIcon() {
  const target = currentCartFlightTarget();
  if (!target) return;
  target.classList.remove('is-pulsing');
  void target.offsetWidth;
  target.classList.add('is-pulsing');
}

function pluralizeUk(n, [one, few, many]) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

// ---------- Розрахунок сум кошика ----------

function computeTotals(includeDelivery) {
  const subtotal = cart.getSubtotal();
  const discountPercent = state.promo.discountPercent;
  const discount = Math.round((subtotal * discountPercent) / 100);
  const afterDiscount = subtotal - discount;

  let deliveryCost = 0;
  if (includeDelivery && state.deliveryType === 'delivery' && afterDiscount < FREE_DELIVERY_THRESHOLD) {
    deliveryCost = DELIVERY_FEE;
  }

  return {
    subtotal,
    discount,
    discountPercent,
    afterDiscount,
    deliveryCost,
    total: afterDiscount + deliveryCost,
  };
}

// ---------- Рендер кошика в сайдбарі ----------

function renderCartItems() {
  els.cartItemsList.innerHTML = '';
  cart.items.forEach((item) => {
    const row = document.createElement('div');
    row.className = 'cart-item';
    row.innerHTML = `
      <span class="cart-item__name">${escapeHtml(item.name)}</span>
      <span class="cart-item__price">${item.price * item.quantity} ₴</span>
      <div class="cart-item__controls">
        <div class="cart-item__qty">
          <button class="cart-item__qty-btn" data-action="dec" aria-label="Менше">−</button>
          <span class="cart-item__qty-value">${item.quantity}</span>
          <button class="cart-item__qty-btn" data-action="inc" aria-label="Більше">+</button>
        </div>
        <button class="cart-item__remove" data-action="remove" type="button">Прибрати</button>
      </div>`;
    row.querySelector('[data-action="dec"]').addEventListener('click', () => cart.increment(item.productId, -1));
    row.querySelector('[data-action="inc"]').addEventListener('click', () => cart.increment(item.productId, 1));
    row.querySelector('[data-action="remove"]').addEventListener('click', () => {
      row.classList.add('shake');
      setTimeout(() => cart.remove(item.productId), 200);
    });
    els.cartItemsList.appendChild(row);
  });
}

function renderFreeShipping(afterDiscount) {
  els.freeShippingBlock.hidden = false;
  const remaining = Math.max(0, FREE_DELIVERY_THRESHOLD - afterDiscount);
  const pct = Math.min(100, Math.round((afterDiscount / FREE_DELIVERY_THRESHOLD) * 100));
  els.freeShippingFill.style.width = `${pct}%`;
  if (remaining <= 0) {
    els.freeShippingText.textContent = 'Безкоштовна доставка вже доступна 🎉';
    els.freeShippingText.classList.add('is-done');
  } else {
    els.freeShippingText.textContent = `Ще ${remaining} ₴ до безкоштовної доставки`;
    els.freeShippingText.classList.remove('is-done');
  }
}

function renderUpsell() {
  if (cart.isEmpty()) {
    els.upsellBlock.hidden = true;
    return;
  }
  const cartIds = new Set(cart.items.map((i) => i.productId));
  const candidates = state.products
    .filter((p) => !cartIds.has(p.id) && p.inStock)
    .sort((a, b) => b.likesCount - a.likesCount)
    .slice(0, 2);

  if (candidates.length === 0) {
    els.upsellBlock.hidden = true;
    return;
  }

  els.upsellBlock.hidden = false;
  els.upsellList.innerHTML = '';
  candidates.forEach((p) => {
    const row = document.createElement('div');
    row.className = 'upsell__item';
    row.innerHTML = `
      <div>
        <span class="upsell__item-name">${escapeHtml(p.name)}</span>
        <span class="upsell__item-price">${p.price} ₴</span>
      </div>
      <button class="upsell__add" type="button" aria-label="Додати «${escapeHtml(p.name)}»">+</button>`;
    const btn = row.querySelector('.upsell__add');
    btn.addEventListener('click', () => {
      cart.add(p, 1);
      flyToCart(btn);
    });
    els.upsellList.appendChild(row);
  });
}

function renderCartSummary() {
  const totals = computeTotals(false);
  els.cartSummary.hidden = false;
  els.openCheckoutBtn.hidden = false;

  animateNumberTo(els.cartSubtotalValue, totals.subtotal);
  if (totals.discount > 0) {
    els.cartDiscountRow.hidden = false;
    els.cartDiscountValue.textContent = `−${totals.discount} ₴`;
  } else {
    els.cartDiscountRow.hidden = true;
  }
  animateNumberTo(els.cartTotalValue, totals.afterDiscount);
}

function updateCartBadge() {
  const count = cart.getCount();
  if (count > 0) {
    els.cartCountBadge.hidden = false;
    els.cartCountBadge.textContent = String(count);
  } else {
    els.cartCountBadge.hidden = true;
  }
}

function updateMobileCartBar() {
  const count = cart.getCount();
  if (count === 0) {
    els.mobileCartBar.hidden = true;
    return;
  }
  const totals = computeTotals(true);
  els.mobileCartBar.hidden = false;
  const noun = pluralizeUk(count, ['товар', 'товари', 'товарів']);
  els.mobileCartText.textContent = `Кошик: ${count} ${noun} · ${totals.total} ₴`;
}

function renderCart() {
  updateCartBadge();
  updateMobileCartBar();

  if (cart.isEmpty()) {
    els.cartEmptyMsg.hidden = false;
    els.cartItemsList.innerHTML = '';
    els.freeShippingBlock.hidden = true;
    els.upsellBlock.hidden = true;
    els.cartSummary.hidden = true;
    els.openCheckoutBtn.hidden = true;
    if (!els.checkoutDrawer.hidden && !els.checkoutFormView.hidden) {
      closeCheckout();
    }
    if (!els.catalogPopup.hidden) renderCatalogPopup();
    return;
  }

  els.cartEmptyMsg.hidden = true;
  renderCartItems();
  const totals = computeTotals(false);
  renderFreeShipping(totals.afterDiscount);
  renderUpsell();
  renderCartSummary();

  if (!els.checkoutDrawer.hidden && !els.checkoutFormView.hidden) {
    renderCheckoutItems();
    updateCheckoutTotals();
  }
  if (!els.catalogPopup.hidden) renderCatalogPopup();
}

// ---------- ПОПАП КАТАЛОГУ (кошик / оплата) ----------

function renderCatalogPopup() {
  els.catalogPopupList.innerHTML = '';
  if (cart.isEmpty()) {
    els.catalogPopupEmpty.hidden = false;
    els.catalogPopupTotal.textContent = '0 ₴';
    els.catalogPopupCheckoutBtn.disabled = true;
    return;
  }
  els.catalogPopupEmpty.hidden = true;
  els.catalogPopupCheckoutBtn.disabled = false;

  cart.items.forEach((item) => {
    const row = document.createElement('div');
    row.className = 'popup-cart-item';
    row.innerHTML = `
      <div class="popup-cart-item__thumb">${
        item.imageUrl
          ? `<img src="${escapeHtml(productImageUrl(item.imageUrl, 'thumb'))}" alt="" loading="lazy" />`
          : escapeHtml(item.name.charAt(0))
      }</div>
      <div class="popup-cart-item__info">
        <span class="popup-cart-item__name">${escapeHtml(item.name)}</span>
        <span class="popup-cart-item__meta">${item.quantity} × ${item.price} ₴</span>
      </div>
      <span class="popup-cart-item__price">${item.quantity * item.price} ₴</span>
      <button class="popup-cart-item__remove" type="button" aria-label="Прибрати товар" title="Прибрати">✕</button>`;

    const removeBtn = row.querySelector('.popup-cart-item__remove');
    removeBtn.addEventListener('click', () => {
      row.classList.add('shake');
      setTimeout(() => {
        cart.remove(item.productId);
        showToast(`Прибрано: ${item.name}`, 'info');
      }, 220);
    });

    els.catalogPopupList.appendChild(row);
  });

  const totals = computeTotals(false);
  els.catalogPopupTotal.textContent = `${totals.afterDiscount} ₴`;
}

function openCatalogPopup() {
  renderCatalogPopup();
  els.catalogPopup.hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeCatalogPopup() {
  els.catalogPopup.hidden = true;
  document.body.style.overflow = '';
}

// ---------- ПОПАП ОПЛАТИ КАРТКОЮ ----------

function formatCardNumber(value) {
  const digits = value.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(value) {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return digits;
}

function detectCardBrand(digits) {
  if (/^4/.test(digits)) return 'VISA';
  if (/^(5[1-5]|2(2[2-9][1-9]|2[3-9]\d|[3-6]\d\d|7[01]\d|720))/.test(digits)) return 'MASTERCARD';
  return '';
}

function updateCardVisual() {
  const numDigits = els.cardNumber.value.replace(/\D/g, '');
  const masked = numDigits.padEnd(16, '•').replace(/(.{4})/g, '$1 ').trim();
  els.cardVisualNumber.textContent = masked;
  els.cardVisualBrand.textContent = detectCardBrand(numDigits);
  els.cardVisualHolder.textContent = els.cardHolder.value.trim().toUpperCase() || 'IVAN PETRENKO';
  els.cardVisualExpiry.textContent = els.cardExpiry.value || 'MM/YY';
}

// Алгоритм Луна: відсіює випадково помилково набрані номери карток.
function passesLuhn(digits) {
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = Number(digits[i]);
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
}

// ---------- Помилки під полями ----------

function setFieldError(input, message) {
  const field = input.closest('.checkout-field');
  const box = field ? field.querySelector('.field-error') : null;
  const frame = input.closest('.phone-field') || input;
  frame.classList.toggle('is-invalid', Boolean(message));
  input.setAttribute('aria-invalid', message ? 'true' : 'false');
  if (box) {
    box.textContent = message || '';
    box.hidden = !message;
  }
  return !message;
}

function clearFieldErrorOnInput(input) {
  input.addEventListener('input', () => setFieldError(input, ''));
}

const cardValidators = {
  number() {
    const digits = els.cardNumber.value.replace(/\D/g, '');
    if (digits.length !== 16) return setFieldError(els.cardNumber, 'Номер картки — 16 цифр');
    if (!passesLuhn(digits)) return setFieldError(els.cardNumber, 'Перевірте номер картки — схоже, є помилка');
    return setFieldError(els.cardNumber, '');
  },
  expiry() {
    const m = /^(\d{2})\/(\d{2})$/.exec(els.cardExpiry.value);
    if (!m) return setFieldError(els.cardExpiry, 'Формат MM/YY');
    const month = Number(m[1]);
    const year = 2000 + Number(m[2]);
    if (month < 1 || month > 12) return setFieldError(els.cardExpiry, 'Місяць від 01 до 12');
    const now = new Date();
    if (year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1)) {
      return setFieldError(els.cardExpiry, 'Термін дії картки минув');
    }
    return setFieldError(els.cardExpiry, '');
  },
  cvv() {
    if (els.cardCvv.value.length !== 3) return setFieldError(els.cardCvv, '3 цифри на звороті');
    return setFieldError(els.cardCvv, '');
  },
  holder() {
    if (!/^[A-Za-z][A-Za-z '.\-]{1,39}$/.test(els.cardHolder.value.trim())) {
      return setFieldError(els.cardHolder, 'Імʼя латиницею, як на картці');
    }
    return setFieldError(els.cardHolder, '');
  },
};

function validateCard() {
  // Усі валідатори запускаємо, щоб підсвітити всі помилки одразу.
  const results = [
    [cardValidators.number(), els.cardNumber],
    [cardValidators.expiry(), els.cardExpiry],
    [cardValidators.cvv(), els.cardCvv],
    [cardValidators.holder(), els.cardHolder],
  ];
  const firstBad = results.find(([ok]) => !ok);
  if (firstBad) firstBad[1].focus();
  return !firstBad;
}

function openPaymentPopup() {
  els.paymentError.hidden = true;
  els.paymentSuccess.hidden = true;
  els.paymentFormView.hidden = false;
  els.paymentSubmitBtn.classList.remove('is-loading', 'is-success');
  els.paymentSubmitBtn.disabled = false;
  els.paymentSubmitText.textContent = 'Оплатити';
  els.paymentPopup.hidden = false;
  document.body.style.overflow = 'hidden';
  // На телефоні не фокусуємо автоматично — клавіатура закрила б половину форми.
  if (window.matchMedia('(hover: hover)').matches) setTimeout(() => els.cardNumber.focus(), 100);
}

let paymentCloseTimer = null;
function closePaymentPopup() {
  clearTimeout(paymentCloseTimer);
  els.paymentPopup.hidden = true;
  // Якщо drawer відкритий — скрол лишається заблокованим.
  document.body.style.overflow = els.checkoutDrawer.hidden ? '' : 'hidden';
}

function handlePaymentSubmit() {
  if (!validateCard()) {
    const popup = els.paymentPopup.querySelector('.popup');
    popup.classList.remove('shake');
    void popup.offsetWidth;
    popup.classList.add('shake');
    return;
  }

  els.paymentError.hidden = true;
  els.paymentSubmitBtn.disabled = true;
  els.paymentSubmitBtn.classList.add('is-loading');
  els.paymentSubmitText.textContent = 'Обробка платежу…';

  // Імітація запиту до платіжного шлюзу (у реальному проєкті — запит на бекенд/еквайринг).
  setTimeout(() => {
    const last4 = els.cardNumber.value.replace(/\D/g, '').slice(-4);
    const amount = computeTotals(true).total;

    state.cardFilled = true;
    els.openCardPayBtn.classList.add('is-filled');
    els.openCardPayBtn.querySelector('span').textContent = `Картка: •••• ${last4}`;

    // Форма зникає, на її місці — велике підтвердження прямо у вікні (не внизу сторінки).
    els.paymentSubmitBtn.classList.remove('is-loading');
    els.paymentFormView.hidden = true;
    els.paymentSuccessText.textContent = `Картка •••• ${last4} · ${amount} ₴`;
    els.paymentSuccess.hidden = false;

    paymentCloseTimer = setTimeout(closePaymentPopup, 1800);
  }, 1200);
}

// ---------- Промокод ----------

function setPromoFeedback(text, kind) {
  els.promoFeedback.textContent = text;
  els.promoFeedback.className = 'promo-feedback' + (kind ? ` is-${kind}` : '');
}

async function applyPromo() {
  const code = els.promoInput.value.trim();

  if (!code) {
    state.promo = { code: null, discountPercent: 0 };
    setPromoFeedback('', '');
    renderCart();
    return;
  }

  els.promoApplyBtn.disabled = true;
  els.promoApplyBtn.textContent = '…';
  try {
    const result = await api.checkPromo(code);
    state.promo = { code: result.code, discountPercent: result.discountPercent };
    setPromoFeedback(`Промокод застосовано: −${result.discountPercent}%`, 'success');
  } catch (err) {
    state.promo = { code: null, discountPercent: 0 };
    setPromoFeedback(err.message, 'error');
  }
  els.promoApplyBtn.disabled = false;
  els.promoApplyBtn.textContent = 'OK';
  renderCart();
}

// ---------- Спосіб оплати ----------

function setPaymentMethod(method) {
  state.paymentMethod = method;
  document.querySelectorAll('.payment-options .payment-option').forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.payment === method);
  });
  // Кнопка "Ввести дані картки" видима лише при виборі "Картка"
  if (!els.checkoutDrawer.hidden) {
    els.openCardPayBtn.hidden = method !== 'card';
    els.cashHint.hidden = method !== 'cash';
  }
}

document.querySelectorAll('.payment-options').forEach((group) => {
  group.addEventListener('click', (e) => {
    const btn = e.target.closest('.payment-option');
    if (!btn) return;
    setPaymentMethod(btn.dataset.payment);
  });
});

// ---------- Checkout drawer ----------

function setDeliveryType(type) {
  state.deliveryType = type;
  els.deliveryTypeToggle.querySelectorAll('.delivery-toggle__btn').forEach((btn) => {
    const isActive = btn.dataset.deliveryType === type;
    btn.classList.toggle('is-active', isActive);
    btn.setAttribute('aria-selected', String(isActive));
  });
  els.checkoutAddressField.hidden = type !== 'delivery';
  els.checkoutPickupHint.hidden = type === 'delivery';
  if (!els.checkoutDrawer.hidden && !els.checkoutFormView.hidden) {
    updateCheckoutTotals();
  }
}

els.deliveryTypeToggle.addEventListener('click', (e) => {
  const btn = e.target.closest('.delivery-toggle__btn');
  if (!btn) return;
  setDeliveryType(btn.dataset.deliveryType);
});

function renderCheckoutItems() {
  els.checkoutItemsList.innerHTML = '';
  cart.items.forEach((item) => {
    const row = document.createElement('div');
    row.className = 'checkout-item-row';
    // На телефоні сайдбар-кошика нема, тож змінити кількість / прибрати товар
    // клієнт може саме тут. Будь-яка зміна йде через cart.* -> renderCart()
    // сам перемальовує цей список і суми (а при порожньому кошику закриває форму).
    row.innerHTML = `
      <div class="checkout-item-row__info">
        <span class="checkout-item-row__name">${escapeHtml(item.name)}</span>
        <span class="checkout-item-row__meta">${item.price} ₴ × ${item.quantity} = ${item.price * item.quantity} ₴</span>
      </div>
      <div class="checkout-item-row__qty">
        <button type="button" class="checkout-item-row__btn" data-action="dec" aria-label="Менше: ${escapeHtml(item.name)}">−</button>
        <span class="checkout-item-row__qty-value" aria-live="polite">${item.quantity}</span>
        <button type="button" class="checkout-item-row__btn" data-action="inc" aria-label="Більше: ${escapeHtml(item.name)}">+</button>
      </div>
      <button type="button" class="checkout-item-row__remove" data-action="remove"
              aria-label="Прибрати з кошика: ${escapeHtml(item.name)}" title="Прибрати">✕</button>`;
    row.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      if (btn.dataset.action === 'inc') cart.increment(item.productId, 1);
      else if (btn.dataset.action === 'dec') cart.increment(item.productId, -1);
      else cart.remove(item.productId);
    });
    els.checkoutItemsList.appendChild(row);
  });
}

function updateCheckoutTotals() {
  const totals = computeTotals(true);
  els.checkoutSubtotal.textContent = `${totals.subtotal} ₴`;

  if (totals.discount > 0) {
    els.checkoutDiscountRow.hidden = false;
    els.checkoutDiscount.textContent = `−${totals.discount} ₴`;
  } else {
    els.checkoutDiscountRow.hidden = true;
  }

  if (state.deliveryType !== 'delivery') {
    els.checkoutDeliveryCost.textContent = '—';
  } else {
    els.checkoutDeliveryCost.textContent = totals.deliveryCost > 0 ? `${totals.deliveryCost} ₴` : 'Безкоштовно';
  }
  els.checkoutTotal.textContent = `${totals.total} ₴`;
  return totals;
}

function showCheckoutError(message) {
  els.checkoutError.textContent = message;
  els.checkoutError.hidden = false;
  els.checkoutError.classList.remove('shake');
  void els.checkoutError.offsetWidth;
  els.checkoutError.classList.add('shake');
}

function openCheckout() {
  if (cart.isEmpty()) return;

  els.checkoutError.hidden = true;
  els.checkoutDrawer.classList.remove('is-confirmed');
  els.checkoutStreet.value = state.street ? state.street.label : els.deliveryAddressInput.value.trim();

  setDeliveryType(state.deliveryType);
  setPaymentMethod(state.paymentMethod);
  renderCheckoutItems();
  updateCheckoutTotals();

  els.openCardPayBtn.hidden = state.paymentMethod !== 'card';
  els.cashHint.hidden = state.paymentMethod !== 'cash';

  els.checkoutFormView.hidden = false;
  els.checkoutConfirmView.hidden = true;
  els.checkoutSubmitBtn.disabled = false;
  els.checkoutSubmitBtn.querySelector('span').textContent = 'Підтвердити замовлення';

  els.checkoutDrawer.hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeCheckout() {
  els.checkoutDrawer.hidden = true;
  els.checkoutDrawer.classList.remove('is-confirmed');
  document.body.style.overflow = '';
}

function showOrderConfirmation(order, snapshot) {
  const paymentLabels = { card: 'карткою (оплачено)', cash: 'готівкою при отриманні' };
  const deliveryText =
    snapshot.deliveryType === 'delivery'
      ? `Кур’єр привезе замовлення на адресу: ${snapshot.addressText}.`
      : 'Чекаємо на вас у барі за адресою вул. Леся Курбаса, 5.';

  els.confirmOrderNumber.textContent = String(order.orderId);
  els.confirmOrderText.textContent =
    `Сума ${order.total} ₴, оплата ${paymentLabels[snapshot.paymentMethod] || snapshot.paymentMethod}. ${deliveryText}`;

  els.checkoutFormView.hidden = true;
  els.checkoutConfirmView.hidden = false;
  // На ПК це окреме вікно по центру екрана, на телефоні — повний екран зверху.
  els.checkoutDrawer.classList.add('is-confirmed');
  els.checkoutDrawer.querySelector('.checkout-drawer__panel').scrollTop = 0;
}

// ---------- Валідація полів чекауту ----------

const CYR = 'А-ЩЬЮЯҐЄІЇа-щьюяґєії';
const HOUSE_RE = new RegExp(`^\\d{1,4}([ -]?[${CYR}])?(\\/\\d{1,3})?( ?(корп\\.|к\\.) ?\\d{1,2})?$`);
const SHORT_FIELD_RE = new RegExp(`^[0-9${CYR}\\-\\/ ]{1,10}$`);
const NAME_RE = new RegExp(`^[A-Za-z${CYR}'’ʼ\\- ]{2,60}$`);
const UA_MOBILE_CODES = new Set([
  '39', '50', '63', '66', '67', '68', '73', '89', '91', '92', '93', '94', '95', '96', '97', '98', '99',
]);

// Лишає в полі лише національну частину номера: XX XXX XX XX (без +380 / 0).
function formatPhoneInput(value) {
  let digits = value.replace(/\D/g, '');
  if (digits.startsWith('380')) digits = digits.slice(3);
  else if (digits.startsWith('0')) digits = digits.slice(1);
  digits = digits.slice(0, 9);
  const parts = [digits.slice(0, 2), digits.slice(2, 5), digits.slice(5, 7), digits.slice(7, 9)];
  return parts.filter(Boolean).join(' ');
}

function getPhoneValue() {
  return `+380${els.checkoutPhone.value.replace(/\D/g, '')}`;
}

const checkoutValidators = {
  street() {
    // Вулиця має бути вибрана саме зі списку — тільки так гарантуємо, що вона в Івано-Франківську.
    if (!els.checkoutStreet.value.trim()) return setFieldError(els.checkoutStreet, 'Вкажіть вулицю');
    if (!state.street) {
      return setFieldError(els.checkoutStreet, 'Оберіть вулицю зі списку підказок (доставка лише по Івано-Франківську)');
    }
    return setFieldError(els.checkoutStreet, '');
  },
  house() {
    const v = els.checkoutHouse.value.trim();
    if (!v) return setFieldError(els.checkoutHouse, 'Вкажіть номер будинку');
    if (!HOUSE_RE.test(v)) return setFieldError(els.checkoutHouse, 'Наприклад: 12, 12А, 12/3');
    return setFieldError(els.checkoutHouse, '');
  },
  short(input) {
    const v = input.value.trim();
    if (v && !SHORT_FIELD_RE.test(v)) return setFieldError(input, 'Лише цифри та літери');
    return setFieldError(input, '');
  },
  name() {
    const v = els.checkoutName.value.trim();
    if (!v) return setFieldError(els.checkoutName, 'Вкажіть, як до вас звертатись');
    if (!NAME_RE.test(v)) return setFieldError(els.checkoutName, 'Імʼя: лише літери, від 2 символів');
    return setFieldError(els.checkoutName, '');
  },
  phone() {
    const digits = els.checkoutPhone.value.replace(/\D/g, '');
    if (!digits) return setFieldError(els.checkoutPhone, 'Вкажіть номер телефону');
    if (digits.length !== 9) return setFieldError(els.checkoutPhone, 'Номер має містити 9 цифр після +380');
    if (!UA_MOBILE_CODES.has(digits.slice(0, 2))) {
      return setFieldError(els.checkoutPhone, 'Невідомий код оператора — перевірте номер');
    }
    return setFieldError(els.checkoutPhone, '');
  },
};

function validateCheckoutForm() {
  const checks = [];
  if (state.deliveryType === 'delivery') {
    checks.push([checkoutValidators.street(), els.checkoutStreet]);
    checks.push([checkoutValidators.house(), els.checkoutHouse]);
    [els.checkoutApartment, els.checkoutEntrance, els.checkoutFloor, els.checkoutIntercom].forEach((input) =>
      checks.push([checkoutValidators.short(input), input])
    );
  }
  checks.push([checkoutValidators.name(), els.checkoutName]);
  checks.push([checkoutValidators.phone(), els.checkoutPhone]);

  const firstBad = checks.find(([ok]) => !ok);
  if (firstBad) {
    firstBad[1].scrollIntoView({ block: 'center', behavior: 'smooth' });
    firstBad[1].focus({ preventScroll: true });
    return false;
  }
  return true;
}

function resetCheckoutForm() {
  [
    els.checkoutStreet, els.checkoutHouse, els.checkoutApartment, els.checkoutEntrance,
    els.checkoutFloor, els.checkoutIntercom, els.checkoutName, els.checkoutPhone,
    els.checkoutComment, els.deliveryAddressInput,
    els.cardNumber, els.cardExpiry, els.cardCvv, els.cardHolder,
  ].forEach((input) => {
    input.value = '';
    setFieldError(input, '');
  });
  state.street = null;
  updateCardVisual();
}

async function submitCheckout() {
  els.checkoutError.hidden = true;

  if (!validateCheckoutForm()) return;
  if (state.paymentMethod === 'card' && !state.cardFilled) {
    showCheckoutError('Введіть дані картки та підтвердіть оплату');
    return;
  }

  const payload = {
    items: cart.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
    deliveryType: state.deliveryType,
    street: state.deliveryType === 'delivery' ? state.street.name : '',
    house: els.checkoutHouse.value.trim(),
    apartment: els.checkoutApartment.value.trim(),
    entrance: els.checkoutEntrance.value.trim(),
    floor: els.checkoutFloor.value.trim(),
    intercom: els.checkoutIntercom.value.trim(),
    paymentMethod: state.paymentMethod,
    customerName: els.checkoutName.value.trim(),
    customerPhone: getPhoneValue(),
    comment: els.checkoutComment.value.trim(),
    promoCode: state.promo.code,
  };

  // Знімок для екрана підтвердження — форму ми очистимо одразу після успіху.
  const snapshot = {
    deliveryType: payload.deliveryType,
    paymentMethod: payload.paymentMethod,
    addressText:
      payload.deliveryType === 'delivery'
        ? `${state.street.label}, ${payload.house}` + (payload.apartment ? `, кв. ${payload.apartment}` : '')
        : '',
  };

  els.checkoutSubmitBtn.disabled = true;
  els.checkoutSubmitBtn.querySelector('span').textContent = 'Надсилаємо…';

  try {
    const order = await api.createOrder(payload);
    showOrderConfirmation(order, snapshot);

    cart.clear();
    state.promo = { code: null, discountPercent: 0 };
    state.cardFilled = false;
    els.promoInput.value = '';
    setPromoFeedback('', '');
    resetCheckoutForm();
    els.openCardPayBtn.classList.remove('is-filled');
    els.openCardPayBtn.querySelector('span').textContent = 'Ввести дані картки';
  } catch (err) {
    showCheckoutError(err.message);
    els.checkoutSubmitBtn.disabled = false;
    els.checkoutSubmitBtn.querySelector('span').textContent = 'Підтвердити замовлення';
  }
}

// ---------- Підказки вулиць (автокомпліт) ----------

function attachStreetAutocomplete(input, { onPick, onType }) {
  const list = input.parentElement.querySelector('.ac__list');
  let items = [];
  let active = -1;
  let timer = null;
  let controller = null;

  function close() {
    list.hidden = true;
    active = -1;
  }

  function highlight(index) {
    active = index;
    [...list.children].forEach((li, i) => li.classList.toggle('is-active', i === index));
  }

  function render(emptyText) {
    list.innerHTML = '';
    if (items.length === 0) {
      const li = document.createElement('li');
      li.className = 'ac__empty';
      li.textContent = emptyText;
      list.appendChild(li);
    } else {
      items.forEach((item, i) => {
        const li = document.createElement('li');
        li.className = 'ac__item';
        li.setAttribute('role', 'option');
        li.textContent = item.label;
        // mousedown, а не click: інакше blur поля закриє список раніше за клік.
        li.addEventListener('mousedown', (e) => {
          e.preventDefault();
          pick(item);
        });
        list.appendChild(li);
      });
    }
    list.hidden = false;
    active = -1;
  }

  function pick(item) {
    input.value = item.label;
    close();
    onPick(item);
  }

  async function search(q) {
    controller?.abort();
    controller = new AbortController();
    try {
      items = await api.searchStreets(q, controller.signal);
      render('Такої вулиці в Івано-Франківську не знайдено');
    } catch (err) {
      if (err.name !== 'AbortError') close();
    }
  }

  input.addEventListener('input', () => {
    onType();
    clearTimeout(timer);
    const q = input.value.trim();
    if (q.length < 2) {
      items = [];
      close();
      return;
    }
    timer = setTimeout(() => search(q), 180);
  });

  input.addEventListener('keydown', (e) => {
    if (list.hidden) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      highlight(Math.min(items.length - 1, active + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      highlight(Math.max(0, active - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const chosen = items[active >= 0 ? active : 0];
      if (chosen) pick(chosen);
    } else if (e.key === 'Escape') {
      e.stopPropagation(); // не закривати заодно весь drawer
      close();
    }
  });

  input.addEventListener('blur', () => {
    // Якщо клієнт ввів назву повністю й не клікнув підказку — приймаємо точний збіг.
    const typed = input.value.trim().toLowerCase();
    const exact = items.find((it) => it.label.toLowerCase() === typed || it.name.toLowerCase() === typed);
    if (exact && !state.street) pick(exact);
    setTimeout(close, 100);
  });
}

function pickStreet(item) {
  state.street = item;
  els.deliveryAddressInput.value = item.label;
  els.checkoutStreet.value = item.label;
  setFieldError(els.checkoutStreet, '');
}

function resetStreet() {
  state.street = null;
}

attachStreetAutocomplete(els.deliveryAddressInput, { onPick: pickStreet, onType: resetStreet });
attachStreetAutocomplete(els.checkoutStreet, { onPick: pickStreet, onType: resetStreet });

// ---------- Слухачі подій ----------

els.sectionBtns.forEach((btn) => {
  btn.addEventListener('click', () => selectSection(btn.dataset.section));
});

els.searchInput.addEventListener('input', onSearchInput);

els.catArrowLeft.addEventListener('click', () => {
  els.catStrip.scrollBy({ left: -240, behavior: 'smooth' });
});
els.catArrowRight.addEventListener('click', () => {
  els.catStrip.scrollBy({ left: 240, behavior: 'smooth' });
});

els.modalClose.addEventListener('click', closeModal);
els.modalLike.addEventListener('click', () => {
  if (activeProduct) toggleLike(activeProduct.id);
});
els.modalOverlay.addEventListener('click', (e) => {
  if (e.target === els.modalOverlay) closeModal();
});

els.qtyMinus.addEventListener('click', () => changeQty(-1));
els.qtyPlus.addEventListener('click', () => changeQty(1));

els.modalAdd.addEventListener('click', () => {
  if (!activeProduct) return;
  cart.add(activeProduct, modalQty);
  flyToCart(els.modalAdd);
  showToast(`Додано в кошик: ${activeProduct.name} × ${modalQty}`, 'success');
  closeModal();
});

els.promoApplyBtn.addEventListener('click', applyPromo);
els.promoInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') applyPromo();
});

// Відкриття попапу каталогу з кошика / оплати
els.openCartPopupBtn.addEventListener('click', openCatalogPopup);
els.openPaymentPopupBtn.addEventListener('click', openCatalogPopup);

els.catalogPopupClose.addEventListener('click', closeCatalogPopup);
els.catalogPopup.addEventListener('click', (e) => {
  if (e.target === els.catalogPopup) closeCatalogPopup();
});
els.catalogPopupCheckoutBtn.addEventListener('click', () => {
  closeCatalogPopup();
  openCheckout();
});

// Попап оплати карткою
els.openCardPayBtn.addEventListener('click', openPaymentPopup);
els.paymentPopupClose.addEventListener('click', closePaymentPopup);
els.paymentPopup.addEventListener('click', (e) => {
  if (e.target === els.paymentPopup) closePaymentPopup();
});

els.cardNumber.addEventListener('input', (e) => {
  e.target.value = formatCardNumber(e.target.value);
  updateCardVisual();
});
els.cardExpiry.addEventListener('input', (e) => {
  e.target.value = formatExpiry(e.target.value);
  updateCardVisual();
});
els.cardCvv.addEventListener('input', (e) => {
  e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4);
});
els.paymentSubmitBtn.addEventListener('click', handlePaymentSubmit);
[els.cardNumber, els.cardExpiry, els.cardCvv, els.cardHolder].forEach(clearFieldErrorOnInput);
els.cardNumber.addEventListener('blur', () => els.cardNumber.value && cardValidators.number());
els.cardExpiry.addEventListener('blur', () => els.cardExpiry.value && cardValidators.expiry());
els.cardHolder.addEventListener('input', (e) => {
  // Прибираємо все, крім латиниці — на картці ім'я завжди латинкою.
  e.target.value = e.target.value.replace(/[^A-Za-z '.\-]/g, '').toUpperCase();
  updateCardVisual();
});

// Checkout
els.openCheckoutBtn.addEventListener('click', openCheckout);
els.mobileCartBar.addEventListener('click', openCheckout);
els.mobileCartBar.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    openCheckout();
  }
});
els.checkoutClose.addEventListener('click', closeCheckout);
els.checkoutConfirmCloseBtn.addEventListener('click', closeCheckout);
els.checkoutDrawer.addEventListener('click', (e) => {
  if (e.target === els.checkoutDrawer) closeCheckout();
});
els.checkoutSubmitBtn.addEventListener('click', submitCheckout);

// Поля чекауту: телефон з маскою, помилки зникають під час введення, перевірка при виході з поля.
els.checkoutPhone.addEventListener('input', (e) => {
  e.target.value = formatPhoneInput(e.target.value);
});
els.checkoutPhone.addEventListener('blur', () => els.checkoutPhone.value && checkoutValidators.phone());
els.checkoutName.addEventListener('blur', () => els.checkoutName.value && checkoutValidators.name());
els.checkoutHouse.addEventListener('blur', () => els.checkoutHouse.value && checkoutValidators.house());
[
  els.checkoutStreet, els.checkoutHouse, els.checkoutApartment, els.checkoutEntrance,
  els.checkoutFloor, els.checkoutIntercom, els.checkoutName, els.checkoutPhone,
].forEach(clearFieldErrorOnInput);

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (!els.modalOverlay.hidden) closeModal();
  if (!els.paymentPopup.hidden) closePaymentPopup();
  if (!els.catalogPopup.hidden) closeCatalogPopup();
  if (!els.checkoutDrawer.hidden) closeCheckout();
});

cart.subscribe(renderCart);

// ---------- Старт ----------

loadCategories().catch((e) => console.error('categories:', e));
loadProducts().catch((e) => console.error('products:', e));
renderCart();
