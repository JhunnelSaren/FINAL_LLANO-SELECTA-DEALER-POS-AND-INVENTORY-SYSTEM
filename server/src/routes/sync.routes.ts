import { Router, Response } from 'express';
import { AuthenticatedRequest, authenticateToken } from '../auth.js';
import { getTursoSyncStatus } from '../turso-sync.js';

const router = Router();

router.get('/status', authenticateToken, async (_req: AuthenticatedRequest, res: Response) => {
  res.json(await getTursoSyncStatus());
});

export default router;
