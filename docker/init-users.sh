#!/bin/sh
set -eu

psql --set=ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  --set=accueil_password="$PG_ACCUEIL_PASSWORD" --set=compta_password="$PG_COMPTA_PASSWORD" <<'SQL'
ALTER ROLE utilisateur_accueil PASSWORD :'accueil_password';
ALTER ROLE utilisateur_compta PASSWORD :'compta_password';
SQL
