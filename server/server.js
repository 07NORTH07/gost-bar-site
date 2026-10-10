import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { categoriesRouter } from './routes/categories.js';
import { productsRouter } from './routes/products.js';
import { ordersRouter } from './routes/orders.js';
import { promoRouter } from './routes/promo.js';
import { streetsRouter } from './routes/streets.js';
import { adminRouter, UPLOADS_DIR } from './routes/admin.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, '..', 'public');

const app = express();
const PORT = process.env.PORT || 3000;

app.disable('x-powered-by');

// За reverse-proxy (Render тощо) справжня IP клієнта лежить в X-Forwarded-For.
// Без цього req.ip — адреса проксі, і ліміти спроб/запитів рахуються на всіх
// разом. Локально proxy нема, тож НЕ вмикаємо (інакше клієнт сам підробить
// заголовок і обійде ліміт): лише з env TRUST_PROXY=1 або на Render (RENDER=true).
const TRUST_PROXY = process.env.TRUST_PROXY ?? (process.env.RENDER ? '1' : '');
if (TRUST_PROXY) app.set('trust proxy', Number(TRUST_PROXY) || TRUST_PROXY);

// Захисні заголовки. upgradeInsecureRequests вимкнено: інакше при показі
// з телефона по http://192.168.x.x браузер перекидав би підресурси на https
// і сайт би зламався. Шрифти Google дозволені дефолтною політикою (https:).
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        'upgrade-insecure-requests': null,
        'img-src': ["'self'", 'data:', 'blob:'],
      },
    },
  })
);

// Ліміти частоти запитів (за IP). Повідомлення — JSON, як і в решти API.
function limiter(windowMs, limit, error) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error },
  });
}
const MIN = 60 * 1000;
app.use('/api', limiter(15 * MIN, 1500, 'Забагато запитів. Спробуйте трохи пізніше.'));
app.post('/api/orders', limiter(15 * MIN, 10, 'Забагато замовлень з однієї адреси. Спробуйте пізніше.'));
app.use('/api/promo', limiter(15 * MIN, 30, 'Забагато спроб промокоду. Спробуйте пізніше.'));
app.use('/api/products/:id/like', limiter(MIN, 40, 'Забагато вподобань за хвилину. Зачекайте трохи.'));

// Адмінка йде ДО глобального express.json(): їй потрібен більший ліміт тіла (фото).
app.use('/api/admin', adminRouter);

app.use(express.json({ limit: '50kb' }));
app.use(express.static(PUBLIC_DIR));
// Завантажені фото товарів (лежать поза public/, щоб не змішувати з кодом).
app.use('/uploads', express.static(UPLOADS_DIR, { maxAge: '7d', immutable: true }));

app.use('/api/categories', categoriesRouter);
app.use('/api/products', productsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/promo', promoRouter);
app.use('/api/streets', streetsRouter);

// Невідомі адреси API — JSON, а не HTML-сторінка Express.
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Не знайдено' });
});

// Загальний обробник помилок: клієнту — коротке JSON-повідомлення без стеку,
// деталі лише в консоль сервера. Помилки body-parser (кривий JSON, завеликий
// запит) мають свій status — віддаємо його як є.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = Number.isInteger(err.status) && err.status >= 400 && err.status < 600 ? err.status : 500;
  if (status >= 500) console.error(`[${req.method} ${req.originalUrl}]`, err);
  if (res.headersSent) return;
  const messages = {
    400: 'Некоректний запит',
    413: 'Запит завеликий',
  };
  const error = status >= 500 ? 'Помилка сервера. Спробуйте пізніше.' : messages[status] || 'Помилка запиту';
  if (req.path.startsWith('/api/') || req.originalUrl.startsWith('/api/')) {
    return res.status(status).json({ error });
  }
  res.status(status).type('text/plain; charset=utf-8').send(error);
});

app.listen(PORT, () => {
  console.log(`ГОСТ бар: сервер запущено — http://localhost:${PORT}`);
});
