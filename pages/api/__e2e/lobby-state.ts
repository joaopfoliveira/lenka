import type { NextApiRequest, NextApiResponse } from 'next';
import { gameManager } from '../../../lib/gameManager';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (process.env.E2E_FIXTURE !== '1') {
    return res.status(404).json({ error: 'e2e only' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method not allowed' });
  }

  const code = (req.query.code as string) || '';
  if (!code) {
    return res.status(400).json({ error: 'missing code' });
  }

  const lobby = gameManager.getLobbyState(code);
  if (!lobby) {
    return res.status(404).json({ error: 'lobby not found' });
  }

  return res.status(200).json({ lobby });
}
