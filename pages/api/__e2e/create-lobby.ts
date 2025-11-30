import type { NextApiRequest, NextApiResponse } from 'next';
import { gameManager } from '../../../lib/gameManager';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (process.env.E2E_FIXTURE !== '1') {
    return res.status(404).json({ error: 'e2e only' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method not allowed' });
  }

  const rounds = Math.max(1, Math.min(10, Number(req.query.rounds) || 2));
  const source = (req.query.source as any) || 'mixed';
  const name = (req.query.name as string) || 'E2E Host';
  const lobby = gameManager.createLobby(rounds, name, `e2e-${Date.now()}`, source);
  return res.status(200).json({ code: lobby.code });
}
