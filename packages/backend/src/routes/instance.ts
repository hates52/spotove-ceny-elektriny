import { Router, Request, Response } from 'express';

const router = Router();
const instanceId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

router.get('/', (_req: Request, res: Response) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.json({ instanceId });
});

export default router;
