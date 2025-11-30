import type { NextApiRequest, NextApiResponse } from 'next';
import { gameManager } from '../../../lib/gameManager';
import { productCollection } from '../../../data/products';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (process.env.E2E_FIXTURE !== '1') {
    return res.status(404).json({ error: 'e2e only' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method not allowed' });
  }

  const code = (req.query.code as string) || '';
  const count = Math.max(1, Math.min(50, Number(req.query.count) || 5));
  const lobby = gameManager.startGame(code);
  if (!lobby) {
    return res.status(400).json({ error: 'lobby not found or invalid state' });
  }

  const products = productCollection.products.slice(0, count);
  const started = gameManager.startGameWithClientProducts(code, products as any);
  if (!started) {
    return res.status(500).json({ error: 'failed to start' });
  }

  return res.status(200).json({ ok: true, code, products: started.products });
}
