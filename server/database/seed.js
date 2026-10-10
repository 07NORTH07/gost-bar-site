// Наповнює БД стартовими даними. Запускати: npm run seed
// Можна запускати повторно — спочатку чистить таблиці categories/products.
import { db } from './db.js';

// Захист: з адмінкою в БД з'являються твої власні товари й фото — випадковий
// повторний `npm run seed` їх знищив би. Для свідомого скидання: --force
const existing = db.prepare('SELECT COUNT(*) AS n FROM products').get().n;
if (existing > 0 && !process.argv.includes('--force')) {
  console.error(
    `У БД вже є товари (${existing}). Seed їх повністю видалить разом з доданими через адмінку.\n` +
      'Якщо точно треба скинути: node server/database/seed.js --force'
  );
  process.exit(1);
}

db.exec('DELETE FROM products');
db.exec('DELETE FROM categories');
db.exec('DELETE FROM promo_codes');
db.exec("DELETE FROM sqlite_sequence WHERE name IN ('products','categories','promo_codes')");

const insertCategory = db.prepare(
  'INSERT INTO categories (section, name, sort_order) VALUES (?, ?, ?)'
);
const insertPromo = db.prepare(
  'INSERT INTO promo_codes (code, discount_percent, active) VALUES (?, ?, ?)'
);
const insertProduct = db.prepare(`
  INSERT INTO products
    (category_id, name, description, price, unit, image_url, is_new, is_spicy, likes_count, in_stock)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

function addCategory(section, name, sortOrder) {
  const info = insertCategory.run(section, name, sortOrder);
  return Number(info.lastInsertRowid);
}

function addProduct(categoryId, p) {
  insertProduct.run(
    categoryId,
    p.name,
    p.description ?? '',
    p.price,
    p.unit ?? '',
    p.image_url ?? '',
    p.isNew ? 1 : 0,
    p.isSpicy ? 1 : 0,
    p.likes ?? 0,
    p.inStock === false ? 0 : 1
  );
}

// ---------- КУХНЯ ----------
const cKitchenStarters = addCategory('kitchen', 'Закуски', 1);
const cKitchenMain = addCategory('kitchen', 'Основні страви', 2);
const cKitchenFirst = addCategory('kitchen', 'На перше', 3);
const cKitchenSalads = addCategory('kitchen', 'Салати', 4);
const cKitchenDesserts = addCategory('kitchen', 'Десерти', 5);

addProduct(cKitchenStarters, { name: 'Сирні палички з соусом', description: 'Сир твердий, олія, кукурудзяні пластівці', price: 95, unit: '180 г', likes: 93 });
addProduct(cKitchenStarters, { name: 'Дошка снекова', description: 'Сир косичка, фрі, телятина в’ялена', price: 265, unit: '430 г', likes: 17 });
addProduct(cKitchenStarters, { name: 'Нагетси з соусом', description: 'Курячі нагетси, вареники фрі, попкорн', price: 100, unit: '200 г', isNew: true, likes: 41 });
addProduct(cKitchenStarters, { name: 'Дошка фрі', description: 'Картопля фрі, соуси', price: 250, unit: '700 г', likes: 58 });
addProduct(cKitchenStarters, { name: 'Дошка крилець з соусом', description: 'Курячі крильця зі спеціями, смажені у фритюрі', price: 235, unit: '600 г', isNew: true, likes: 23 });
addProduct(cKitchenStarters, { name: 'Дошка на 1,5 кг', description: 'Курячі нагетси, курячі крильця, сир косичка…', price: 1500, unit: '1500 г', likes: 24 });
addProduct(cKitchenStarters, { name: 'Арахіс солоний', description: 'Арахіс смажений з приправами', price: 60, unit: '80 г', likes: 18 });
addProduct(cKitchenStarters, { name: 'Снеки з часниковим соусом', description: 'Борошно, крохмаль, сіль, перець, паприка', price: 60, unit: '80 г', isNew: true, likes: 40 });
addProduct(cKitchenStarters, { name: 'Мигдаль у спеціях', description: 'Мигдаль смажений з сіллю та перцем', price: 105, unit: '70 г', likes: 7 });
addProduct(cKitchenStarters, { name: 'Лаваш з сиром', description: 'Лаваш, сир твердий, копчений, песто', price: 85, unit: '150 г', likes: 38 });
addProduct(cKitchenStarters, { name: 'Сир косичка фрі', description: 'Сир косичка, смажений у фритюрі', price: 80, unit: '90 г', likes: 59 });
addProduct(cKitchenStarters, { name: 'Оселедець по-норвезьки', description: 'Оселедець, картопля по-домашньому', price: 95, unit: '210 г', likes: 27 });
addProduct(cKitchenStarters, { name: 'В’ялене куряче філе', description: 'В’ялене куряче філе', price: 95, unit: '80 г', likes: 13 });
addProduct(cKitchenStarters, { name: 'Лаваш з курткою та помідором', description: 'Лаваш, варене куряче філе, помідор, зелень', price: 98, unit: '200 г', likes: 34 });
addProduct(cKitchenStarters, { name: 'Сирна дошка', description: 'Сирні палички, сир косичка, лаваш з сиром', price: 205, unit: '400 г', isNew: true, likes: 23 });
addProduct(cKitchenStarters, { name: 'Попкорн курячий гострий', description: 'Курячий попкорн у гострій паніровці', price: 85, unit: '1 шт', isSpicy: true, likes: 8 });

addProduct(cKitchenMain, { name: 'Стейк зі свинини', description: 'Свиняча шия на грилі, соус барбекю', price: 245, unit: '250 г', likes: 12 });
addProduct(cKitchenMain, { name: 'Куряче філе гриль', description: 'Куряче філе, овочі на грилі', price: 195, unit: '280 г', likes: 9 });
addProduct(cKitchenMain, { name: 'Паста карбонара', description: 'Спагеті, бекон, вершковий соус, пармезан', price: 175, unit: '300 г', likes: 21 });

addProduct(cKitchenFirst, { name: 'Борщ український', description: 'Класичний борщ з пампушками', price: 110, unit: '350 г', likes: 44 });
addProduct(cKitchenFirst, { name: 'Крем-суп грибний', description: 'Крем-суп з лісових грибів', price: 120, unit: '300 г', likes: 15 });

addProduct(cKitchenSalads, { name: 'Цезар з куркою', description: 'Салат Цезар, куряче філе, пармезан, грінки', price: 155, unit: '250 г', likes: 31 });
addProduct(cKitchenSalads, { name: 'Грецький салат', description: 'Овочі, фета, оливки', price: 135, unit: '250 г', likes: 19 });

addProduct(cKitchenDesserts, { name: 'Сирники з малиновим соусом', description: 'Домашні сирники, малиновий соус, мʼята', price: 115, unit: '220 г', likes: 26 });
addProduct(cKitchenDesserts, { name: 'Чізкейк Нью-Йорк', description: 'Класичний чізкейк', price: 125, unit: '150 г', likes: 33 });

// ---------- БАР ----------
const cShots = addCategory('bar', 'Шоти', 1);
const cCocktails = addCategory('bar', 'Коктейлі', 2);
const cCider = addCategory('bar', 'Сидр', 3);
const cBeerDraft = addCategory('bar', 'Пиво розливне', 4);
const cBeerCraft = addCategory('bar', 'Пиво крафтове', 5);
const cBeerBottled = addCategory('bar', 'Пиво пляшкове', 6);
const cTinctures = addCategory('bar', 'Настоянки та горілка', 7);
const cWhisky = addCategory('bar', 'Віскі', 8);
const cCognac = addCategory('bar', 'Коньяк, кальвадос', 9);
const cGinRumTequila = addCategory('bar', 'Джин, ром, текіла', 10);
const cWine = addCategory('bar', 'Вино', 11);
const cNonAlco = addCategory('bar', 'Б/а напої', 12);
const cTeaCoffee = addCategory('bar', 'Чай та кава', 13);

addProduct(cShots, { name: 'Сет Весела Корівка', description: 'Сет з 5-ти шотів: Баунті, Дереалізація…', price: 425, unit: '1 шт', isNew: true, likes: 4 });
addProduct(cShots, { name: 'Сет Наша класика', description: 'Сет з 5-ти шотів: Зелений мексиканець, Джиншот…', price: 425, unit: '1 шт', isNew: true, likes: 5 });
addProduct(cShots, { name: 'Сет Верховина', description: 'Сет з 5-ти шотів: Дикий гуцул, Чіловий гуцул…', price: 425, unit: '1 шт', isNew: true, likes: 4 });
addProduct(cShots, { name: 'Скажений пес', description: 'Сироп гренадін, горілка, табаско', price: 80, unit: '1 шт', isSpicy: true, likes: 6 });
addProduct(cShots, { name: 'Зелений мексиканець', description: 'Сироп зелений банан, лимонний дресінг, текіла', price: 95, unit: '1 шт', likes: 18 });
addProduct(cShots, { name: 'Джиншот', description: 'Сироп лісової ягоди, лимонний концентрат, джин', price: 95, unit: '1 шт', likes: 0 });
addProduct(cShots, { name: 'Lemon Rush', description: 'Лимонний сироп, лимонний концентрат, лимонна наливка', price: 95, unit: '1 шт', likes: 0 });
addProduct(cShots, { name: 'Пустись берега', description: 'Лимонний концентрат, самбука, мʼятна…', price: 95, unit: '1 шт', likes: 0 });
addProduct(cShots, { name: 'Кровотеча', description: 'Самбука, коньяк, наливка, тріпл сек, сироп гренадін', price: 95, unit: '1 шт', isNew: true, likes: 1 });
addProduct(cShots, { name: 'Дикий гуцул', description: 'Jägermeister, самбука, текіла', price: 95, unit: '1 шт', isNew: true, likes: 3 });
addProduct(cShots, { name: 'Чіловий гуцул', description: 'Самбука, наливка, сироп гренадін', price: 95, unit: '1 шт', isNew: true, likes: 6 });
addProduct(cShots, { name: 'Баунті', description: 'Сироп кокос, наливка, Bacardi', price: 95, unit: '1 шт', isNew: true, likes: 5 });
addProduct(cShots, { name: 'Дзвінок колишнім', description: 'Сироп зелений банан, Jägermeister, абсент…', price: 95, unit: '1 шт', isNew: true, likes: 4 });
addProduct(cShots, { name: 'S.W.A.G', description: 'Самбука, абсент, сироп гренадін, Sam Barton', price: 95, unit: '1 шт', isNew: true, likes: 2 });
addProduct(cShots, { name: 'Габела', description: 'Jägermeister, яблучний лікер, джин Larios', price: 95, unit: '1 шт', isNew: true, likes: 1 });
addProduct(cShots, { name: 'Дереалізація', description: 'Jägermeister, сироп кокос, тріпл сек', price: 95, unit: '1 шт', isNew: true, likes: 3 });
addProduct(cShots, { name: 'Мертва Зона', description: 'Blue Curacao, молочна наливка, абсент', price: 95, unit: '1 шт', isNew: true, likes: 0 });
addProduct(cShots, { name: '8-ма Миля', description: 'Blue Curacao, молочна наливка, Triple Sec', price: 95, unit: '1 шт', isNew: true, likes: 1 });

addProduct(cCocktails, { name: 'Мохіто класичний', description: 'Ром, лайм, мʼята, содова', price: 165, unit: '400 мл', likes: 22 });
addProduct(cCocktails, { name: 'Апероль Шпріц', description: 'Апероль, просекко, содова', price: 185, unit: '300 мл', likes: 30 });
addProduct(cCocktails, { name: 'Космополітен', description: 'Горілка, тріпл сек, журавлинний сік, лайм', price: 175, unit: '250 мл', likes: 14 });

addProduct(cCider, { name: 'Сидр яблучний', description: 'Класичний яблучний сидр', price: 95, unit: '400 мл', likes: 10 });

addProduct(cBeerDraft, { name: 'Лагер розливний', description: 'Світле пиво, 0.5 л', price: 75, unit: '500 мл', likes: 20 });

addProduct(cBeerCraft, { name: 'IPA крафтове', description: 'Хмільне крафтове IPA', price: 110, unit: '400 мл', likes: 16 });

addProduct(cBeerBottled, { name: 'Портер пляшковий', description: 'Темне пиво в пляшці', price: 95, unit: '330 мл', likes: 9 });

addProduct(cTinctures, { name: 'Настоянка на хроні', description: 'Домашня настоянка', price: 60, unit: '50 мл', likes: 12 });
addProduct(cTinctures, { name: 'Горілка класична', price: 55, unit: '50 мл', likes: 7 });

addProduct(cWhisky, { name: 'Jameson', price: 120, unit: '50 мл', likes: 25 });

addProduct(cCognac, { name: 'Коньяк 5 зірок', price: 130, unit: '50 мл', likes: 8 });

addProduct(cGinRumTequila, { name: 'Bacardi Carta Blanca', price: 100, unit: '50 мл', likes: 6 });

addProduct(cWine, { name: 'Вино червоне сухе', description: 'Келих', price: 110, unit: '150 мл', likes: 11 });

addProduct(cNonAlco, { name: 'Лимонад домашній', price: 75, unit: '400 мл', likes: 14 });

addProduct(cTeaCoffee, { name: 'Капучино', price: 65, unit: '300 мл', likes: 19 });
addProduct(cTeaCoffee, { name: 'Чай фруктовий', price: 60, unit: '400 мл', likes: 13 });

// ---------- ПРОМОКОДИ ----------
insertPromo.run('GOST10', 10, 1);
insertPromo.run('WELCOME15', 15, 1);
insertPromo.run('OLD5', 5, 0); // неактивний — для перевірки помилки

console.log('Готово: БД наповнена стартовими даними.');
