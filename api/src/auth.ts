import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { Profile } from './database.js';

export interface AuthenticatedRequest extends Request {
  profile?: Profile;
}

export function requireAuth(
  request: AuthenticatedRequest,
  response: Response,
  next: NextFunction,
): void {
  const token = request.header('authorization')?.replace(/^Bearer\s+/i, '');
  const secret = process.env.JWT_SECRET;

  if (!token || !secret) {
    response.status(401).json({ error: 'Connexion requise.' });
    return;
  }

  try {
    const payload = jwt.verify(token, secret) as jwt.JwtPayload;
    if (payload.profile !== 'accueil' && payload.profile !== 'comptabilite') {
      response.status(401).json({ error: 'Session invalide.' });
      return;
    }
    request.profile = payload.profile;
    next();
  } catch {
    response.status(401).json({ error: 'Session expirée. Reconnecte-toi.' });
  }
}

export function requireProfile(...allowedProfiles: Profile[]) {
  return (request: AuthenticatedRequest, response: Response, next: NextFunction) => {
    if (!request.profile || !allowedProfiles.includes(request.profile)) {
      response.status(403).json({ error: 'Accès non autorisé pour ce profil.' });
      return;
    }
    next();
  };
}
