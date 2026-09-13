import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthPayload {
  userId: string;
  email: string;
  orgType: 'KITCHEN' | 'FOOD_PROCESSOR' | 'NGO' | 'LOGISTICS';
  name: string;
}

export interface AuthRequest extends Request {
  user?: AuthPayload;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required. Bearer token missing.' });
    return;
  }

  const token = authHeader.split(' ')[1];
  const secret = process.env.JWT_SECRET || 'dev-secret-not-for-production';

  try {
    const payload = jwt.verify(token, secret) as AuthPayload;
    req.user = payload;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token.' });
    return;
  }
}

export function requireRole(allowedRoles: Array<'KITCHEN' | 'FOOD_PROCESSOR' | 'NGO' | 'LOGISTICS'>) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }

    if (!allowedRoles.includes(req.user.orgType)) {
      res.status(403).json({
        error: `Forbidden. Role '${req.user.orgType}' is not authorized to access this resource.`,
      });
      return;
    }

    next();
  };
}
