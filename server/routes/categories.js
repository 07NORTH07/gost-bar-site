import { Router } from 'express';
import { db } from '../database/db.js';

export const categoriesRouter = Router();

// GET /api/categories?section=kitchen|bar
categoriesRouter.get('/', (req, res) => {
  const { section } = req.query;

  let rows;
  if (section === 'kitchen' || section === 'bar') {
    rows = db
      .prepare('SELECT * FROM categories WHERE section = ? ORDER BY sort_order')
      .all(section);
  } else {
    rows = db.prepare('SELECT * FROM categories ORDER BY section, sort_order').all();
  }

  res.json(rows);
});
