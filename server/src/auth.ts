import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'llano-selecta-dealer-secure-key-bukidnon-2026';

export interface AuthUser {
  id: string;
  username: string;
  name: string;
  email: string;
  role: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export function generateToken(user: AuthUser): string {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No authorization token provided.' });
  }

  jwt.verify(token, JWT_SECRET, async (err, decoded) => {
    if (err || !decoded || typeof decoded === 'string') {
      return res.status(401).json({ error: 'Your session expired. Please sign in again.' });
    }
    try {
      const tokenUser = decoded as AuthUser;
      const user = await prisma.user.findUnique({
        where: { id: tokenUser.id },
        select: { id: true, username: true, name: true, email: true, role: true, status: true },
      });
      if (!user || user.status !== 'Active') {
        return res.status(401).json({ error: 'This account is inactive or no longer exists. Contact the Dealer Admin.' });
      }
      req.user = { id: user.id, username: user.username, name: user.name, email: user.email, role: user.role };
      next();
    } catch {
      res.status(503).json({ error: 'Unable to verify your account right now. Please try again.' });
    }
  });
}

export function requireRole(role: 'Admin') {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ error: `Forbidden. Requires ${role} privileges.` });
    }
    next();
  };
}

export async function recordAudit(
  action: string,
  module: string,
  user: string,
  details: Record<string, any>
) {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        module,
        user,
        details: JSON.stringify(details),
      },
    });
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}
