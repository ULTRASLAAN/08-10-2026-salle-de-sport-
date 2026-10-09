import { Pool } from 'pg';

const common = {
  host: process.env.PG_HOST ?? 'localhost',
  port: Number(process.env.PG_PORT ?? 5432),
  database: process.env.PG_DATABASE ?? 'salle_sport',
  ssl: process.env.PG_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 5,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
};

export const accueilPool = new Pool({
  ...common,
  user: process.env.PG_ACCUEIL_USER,
  password: process.env.PG_ACCUEIL_PASSWORD,
  application_name: 'fitmanager-accueil',
});

export const comptaPool = new Pool({
  ...common,
  user: process.env.PG_COMPTA_USER,
  password: process.env.PG_COMPTA_PASSWORD,
  application_name: 'fitmanager-comptabilite',
});

export type Profile = 'accueil' | 'comptabilite';

export function poolFor(profile: Profile): Pool {
  return profile === 'accueil' ? accueilPool : comptaPool;
}
