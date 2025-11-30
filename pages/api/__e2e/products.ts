import type { NextApiRequest, NextApiResponse } from 'next';
import { productCollection } from '../../../data/products';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (process.env.E2E_FIXTURE !== '1') {
    return res.status(404).json({ error: 'e2e only' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method not allowed' });
  }

  const count = Math.max(1, Math.min(50, Number(req.query.count) || 10));
  res.status(200).json({ products: productCollection.products.slice(0, count) });
}
