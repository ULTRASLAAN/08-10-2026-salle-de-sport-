import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';
import { accueilPool, comptaPool, poolFor } from './database.js';
import type { Profile } from './database.js';
import { requireAuth, requireProfile } from './auth.js';
import type { AuthenticatedRequest } from './auth.js';

const app = express();
const port = Number(process.env.PORT ?? 4000);

app.use(helmet());
app.use(cors({ origin: process.env.APP_ORIGIN ?? 'http://localhost:5173' }));
app.use(express.json({ limit: '32kb' }));

const profiles: Record<string, Profile> = {
  accueil: 'accueil',
  comptabilite: 'comptabilite',
};

function positiveInteger(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function respondWithError(error: unknown, response: express.Response): void {
  const code = (error as { code?: string })?.code;
  if (code === '23505' || code === 'P0001') {
    response.status(409).json({ error: (error as Error).message });
    return;
  }
  if (code === '23503' || code === '23514') {
    response.status(400).json({ error: 'Les informations fournies ne sont pas valides.' });
    return;
  }
  console.error('Erreur API FitManager:', error);
  response.status(500).json({ error: 'Une erreur est survenue. Vérifie la configuration du serveur.' });
}

app.post('/api/auth/login', async (request, response) => {
  const profile = profiles[String(request.body?.profile ?? '')];
  const password = request.body?.password;
  const expectedPassword = profile === 'accueil'
    ? process.env.APP_ACCUEIL_PASSWORD
    : profile === 'comptabilite'
      ? process.env.APP_COMPTA_PASSWORD
      : undefined;

  if (!profile || typeof password !== 'string' || !expectedPassword || password !== expectedPassword) {
    response.status(401).json({ error: 'Profil ou mot de passe incorrect.' });
    return;
  }
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    response.status(503).json({ error: 'Configure une clé JWT_SECRET de 32 caractères minimum dans .env.' });
    return;
  }

  try {
    await poolFor(profile).query('SELECT 1');
    const token = jwt.sign({ profile }, process.env.JWT_SECRET, { expiresIn: '8h' });
    response.json({ token, profile });
  } catch (error) {
    console.error('Connexion PostgreSQL impossible:', error);
    response.status(503).json({ error: 'Connexion PostgreSQL impossible. Vérifie les paramètres PG_* du fichier .env.' });
  }
});

app.get('/api/auth/me', requireAuth, (request: AuthenticatedRequest, response) => {
  response.json({ profile: request.profile });
});

app.get('/api/dashboard', requireAuth, async (request: AuthenticatedRequest, response) => {
  try {
    if (request.profile === 'accueil') {
      const result = await accueilPool.query('SELECT * FROM fitmanager_dashboard_accueil');
      response.json(result.rows[0]);
      return;
    }
    const result = await comptaPool.query('SELECT * FROM fitmanager_dashboard_compta');
    response.json(result.rows[0]);
  } catch (error) {
    respondWithError(error, response);
  }
});

app.get('/api/members', requireAuth, requireProfile('accueil'), async (request: AuthenticatedRequest, response) => {
  const search = String(request.query.search ?? '').trim().slice(0, 100);
  const limit = Math.min(100, Math.max(1, positiveInteger(request.query.limit) ?? 50));
  const offset = positiveInteger(request.query.offset) ?? 0;
  try {
    const result = await accueilPool.query(
      `SELECT adherent_id, nom, prenom, email, date_inscription
       FROM fitmanager_adherents
       WHERE $1 = '' OR nom ILIKE '%' || $1 || '%' OR prenom ILIKE '%' || $1 || '%' OR email ILIKE '%' || $1 || '%'
       ORDER BY nom, prenom
       LIMIT $2 OFFSET $3`,
      [search, limit, offset],
    );
    response.json(result.rows);
  } catch (error) {
    respondWithError(error, response);
  }
});

app.get('/api/memberships', requireAuth, requireProfile('accueil'), async (request: AuthenticatedRequest, response) => {
  const search = String(request.query.search ?? '').trim().slice(0, 100);
  try {
    const result = await accueilPool.query(
      `SELECT abonnement_id, adherent_id, nom, prenom, email, type_abonnement,
              date_debut, date_fin, actif
       FROM fitmanager_abonnements
       WHERE $1 = '' OR nom ILIKE '%' || $1 || '%' OR prenom ILIKE '%' || $1 || '%' OR email ILIKE '%' || $1 || '%'
       ORDER BY date_fin DESC, nom, prenom
       LIMIT 200`,
      [search],
    );
    response.json(result.rows);
  } catch (error) {
    respondWithError(error, response);
  }
});

app.post('/api/memberships', requireAuth, requireProfile('accueil'), async (request: AuthenticatedRequest, response) => {
  const adherentId = positiveInteger(request.body?.adherentId);
  const type = typeof request.body?.type === 'string' ? request.body.type.trim().slice(0, 30) : '';
  const dateDebut = request.body?.dateDebut;
  const dateFin = request.body?.dateFin;
  const actif = request.body?.actif === true;
  if (!adherentId || !type || typeof dateDebut !== 'string' || typeof dateFin !== 'string') {
    response.status(400).json({ error: 'Vérifie les informations de l’abonnement.' });
    return;
  }
  try {
    await accueilPool.query('SELECT fitmanager_maj_abonnement($1, $2, $3, $4, $5)', [adherentId, type, dateDebut, dateFin, actif]);
    response.status(204).end();
  } catch (error) {
    respondWithError(error, response);
  }
});

app.get('/api/courses', requireAuth, requireProfile('accueil'), async (_request: AuthenticatedRequest, response) => {
  try {
    const result = await accueilPool.query(
      `SELECT cours_id, nom, coach, date_heure, capacite_max, reservations_confirmees,
              places_disponibles
       FROM fitmanager_cours
       WHERE date_heure >= CURRENT_TIMESTAMP
       ORDER BY date_heure
       LIMIT 200`,
    );
    response.json(result.rows);
  } catch (error) {
    respondWithError(error, response);
  }
});

app.get('/api/reservations', requireAuth, requireProfile('accueil'), async (request: AuthenticatedRequest, response) => {
  const search = String(request.query.search ?? '').trim().slice(0, 100);
  try {
    const result = await accueilPool.query(
      `SELECT reservation_id, adherent_id, nom, prenom, cours_id, nom_cours,
              date_heure, date_reservation, statut
       FROM vue_accueil_reservations
       WHERE ($1 = '' OR nom ILIKE '%' || $1 || '%' OR prenom ILIKE '%' || $1 || '%' OR nom_cours ILIKE '%' || $1 || '%')
       ORDER BY date_reservation DESC
       LIMIT 200`,
      [search],
    );
    response.json(result.rows);
  } catch (error) {
    respondWithError(error, response);
  }
});

app.post('/api/reservations', requireAuth, requireProfile('accueil'), async (request: AuthenticatedRequest, response) => {
  const adherentId = positiveInteger(request.body?.adherentId);
  const coursId = positiveInteger(request.body?.coursId);
  if (!adherentId || !coursId) {
    response.status(400).json({ error: 'Sélectionne un adhérent et un cours.' });
    return;
  }
  try {
    await accueilPool.query('CALL reserver_cours($1, $2)', [adherentId, coursId]);
    response.status(201).json({ message: 'Réservation confirmée.' });
  } catch (error) {
    respondWithError(error, response);
  }
});

app.delete('/api/reservations/:id', requireAuth, requireProfile('accueil'), async (request: AuthenticatedRequest, response) => {
  const reservationId = positiveInteger(request.params.id);
  if (!reservationId) {
    response.status(400).json({ error: 'Identifiant de réservation invalide.' });
    return;
  }
  try {
    await accueilPool.query('SELECT fitmanager_annuler_reservation($1)', [reservationId]);
    response.status(204).end();
  } catch (error) {
    respondWithError(error, response);
  }
});

app.get('/api/payments', requireAuth, requireProfile('comptabilite'), async (request: AuthenticatedRequest, response) => {
  const search = String(request.query.search ?? '').trim().slice(0, 100);
  try {
    const result = await comptaPool.query(
      `SELECT paiement_id, abonnement_id, adherent_id, nom, prenom, montant,
              date_paiement, statut
       FROM vue_compta_paiements
       WHERE $1 = '' OR nom ILIKE '%' || $1 || '%' OR prenom ILIKE '%' || $1 || '%'
       ORDER BY date_paiement DESC, paiement_id DESC
       LIMIT 200`,
      [search],
    );
    response.json(result.rows);
  } catch (error) {
    respondWithError(error, response);
  }
});

app.get('/api/health', (_request, response) => response.json({ status: 'ok' }));

app.listen(port, () => {
  console.log(`FitManager API disponible sur http://localhost:${port}`);
});

for (const pool of [accueilPool, comptaPool]) {
  pool.on('error', (error) => console.error('Erreur du pool PostgreSQL:', error.message));
}
