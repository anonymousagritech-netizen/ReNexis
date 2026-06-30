import { Request, Response, NextFunction } from 'express';
import { ForbiddenError, UnauthorizedError } from '@/utils/errors';

/**
 * Segregation-of-duties guard.
 * Usage: router.post('/contracts', authenticate, requireRole('ADMIN','UNDERWRITER'), handler)
 */
export function requireRole(...allowedRoles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) throw new UnauthorizedError();
    if (req.user.role === 'ADMIN') return next(); // admin bypasses (still audited)
    if (!allowedRoles.includes(req.user.role)) {
      throw new ForbiddenError(
        `Role '${req.user.role}' is not permitted to perform this action. Required: ${allowedRoles.join(', ')}`
      );
    }
    next();
  };
}
