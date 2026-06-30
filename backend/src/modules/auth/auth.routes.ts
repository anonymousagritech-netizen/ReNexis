import { Router, Request, Response } from 'express';
import { validateBody } from '@/middleware/validate';
import { authenticate } from '@/middleware/authenticate';
import { writeAudit } from '@/middleware/audit';
import { registerSchema, loginSchema, refreshSchema } from './auth.schema';
import { registerUser, loginUser, refreshAccessToken, getMe } from './auth.service';

const router = Router();

router.post('/register', validateBody(registerSchema), async (req: Request, res: Response) => {
  const user = await registerUser(req.body);
  await writeAudit({ req, action: 'CREATE', entityName: 'User', recordId: user.id, afterData: user });
  res.status(201).json({ user });
});

router.post('/login', validateBody(loginSchema), async (req: Request, res: Response) => {
  const result = await loginUser(req.body);
  await writeAudit({ req, action: 'LOGIN', entityName: 'User', recordId: result.user.id });
  res.json(result);
});

router.post('/refresh', validateBody(refreshSchema), async (req: Request, res: Response) => {
  const result = await refreshAccessToken(req.body.refreshToken);
  res.json(result);
});

router.get('/me', authenticate, async (req: Request, res: Response) => {
  const user = await getMe(req.user!.userId);
  res.json({ user });
});

router.post('/logout', authenticate, async (req: Request, res: Response) => {
  await writeAudit({ req, action: 'LOGOUT', entityName: 'User', recordId: req.user!.userId });
  res.json({ message: 'Logged out' });
});

export default router;
