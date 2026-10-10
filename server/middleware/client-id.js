import { randomBytes } from 'node:crypto';

// Анонімний ідентифікатор відвідувача для сердечок. Реєстрації на сайті нема,
// тому сервер сам видає довгий випадковий id у HttpOnly-cookie і далі впізнає
// браузер за ним. Це не захист від свідомого накручування (можна очистити
// cookie), а спосіб: один браузер — одне сердечко на товар, стан переживає
// перезавантаження і працює між вкладками. Від масового накручування — ліміт
// запитів за IP на самих ендпоінтах.
const COOKIE_NAME = 'gost_cid';
const ID_RE = /^[A-Za-z0-9_-]{22}$/;
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

function readCookie(header, name) {
  for (const part of String(header || '').split(';')) {
    const i = part.indexOf('=');
    if (i === -1) continue;
    if (part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return '';
}

// Кладе req.clientId (існуючий або новий) і за потреби ставить cookie.
export function clientId(req, res, next) {
  let id = readCookie(req.headers.cookie, COOKIE_NAME);
  if (!ID_RE.test(id)) {
    id = randomBytes(16).toString('base64url');
    res.cookie(COOKIE_NAME, id, {
      httpOnly: true,
      sameSite: 'lax',
      secure: req.secure, // за proxy (trust proxy) на HTTPS стане true автоматично
      maxAge: ONE_YEAR_MS,
      path: '/',
    });
  }
  req.clientId = id;
  next();
}
