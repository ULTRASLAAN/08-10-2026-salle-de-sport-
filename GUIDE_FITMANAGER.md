# FitManager — guide de démarrage

FitManager est une application web React/TypeScript avec une API Express connectée à PostgreSQL. Elle n'embarque aucune donnée fictive et ne crée, ne réinitialise ni ne modifie les tables du projet SQL.

## Prérequis

- Node.js 20 ou plus récent et npm
- Docker Desktop avec Docker Compose

## Installation

Ouvre un terminal PowerShell dans le dossier du projet, puis exécute :

```powershell
Copy-Item .env.example .env
npm install
docker compose up -d
```

Au premier démarrage, Docker crée la base `salle_sport`, exécute les scripts SQL, applique aux comptes applicatifs les mots de passe de `.env`, puis conserve les données dans un volume. Il n'est pas nécessaire d'installer PostgreSQL ou d'utiliser pgAdmin. Vérifie que le conteneur est prêt avec :

```powershell
docker compose ps
```

Le port hôte utilisé est `5433` pour éviter un conflit avec un PostgreSQL déjà installé sur `5432`. Si `.env` existait déjà, modifie également sa valeur `PG_PORT` en `5433` avant de lancer Docker.

Ouvre ensuite `.env` et renseigne `APP_PASSWORD` avec le mot de passe commun aux profils Accueil et Comptabilité. Remplace aussi `JWT_SECRET` par une clé aléatoire. Pour en générer une dans PowerShell :

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Les comptes applicatifs `utilisateur_accueil` et `utilisateur_compta` sont initialisés avec les mots de passe indiqués dans `.env`. L'API utilise un compte par profil et ne se connecte pas avec le compte administrateur du conteneur. Change aussi `POSTGRES_PASSWORD` dans `.env` si tu modifies le mot de passe administrateur PostgreSQL ; cette variable ne s'applique qu'à la création initiale du volume.

Les scripts d'initialisation Docker ne sont exécutés que lorsque le volume de données est vide. Si tu as déjà un volume existant, ils ne réinitialisent ni ne modifient la base. La suppression du volume efface toutes les données.

### Sécuriser les comptes de démonstration

Le script SQL fourni à l'origine contient des mots de passe de démonstration pour ses deux rôles de connexion. Ils ne sont pas recopiés dans FitManager. Pour une configuration réelle, remplace ces mots de passe dans PostgreSQL avec des valeurs privées, puis reporte-les dans `.env`. Ne partage et ne publie jamais `.env`.

## Démarrer le site

Dans PowerShell, toujours à la racine du projet :

```powershell
npm run dev
```

Ouvre ensuite [http://localhost:5173](http://localhost:5173). Le serveur Express écoute sur le port `4000`; Vite transmet automatiquement les appels `/api` vers ce serveur. Garde le terminal ouvert pendant l'utilisation. `Ctrl+C` arrête les deux serveurs.

Le mot de passe de l'interface est configuré par `APP_PASSWORD` dans `.env` et est commun aux profils Accueil et Comptabilité. Les accès PostgreSQL, séparés par profil, sont configurés avec `PG_ACCUEIL_USER`, `PG_ACCUEIL_PASSWORD`, `PG_COMPTA_USER` et `PG_COMPTA_PASSWORD`.

Pour vérifier la compilation de production :

```powershell
npm run build
```

## Fonctionnement des profils

- **Accueil** : tableau de bord, recherche des adhérents, consultation et mise à jour des abonnements, cours, réservation et annulation.
- **Comptabilité** : tableau de bord financier et consultation des paiements.
- Les réservations passent par `CALL reserver_cours(...)`. Le trigger existant reste responsable du contrôle de capacité.
- Les requêtes de recherche et de pagination utilisent des paramètres SQL ; les secrets sont lus depuis `.env`.

Si la connexion échoue, vérifie d'abord `docker compose ps`, puis que `PG_HOST`, `PG_PORT`, `PG_DATABASE` et les comptes dans `.env` correspondent à la configuration. Pour arrêter PostgreSQL sans supprimer les données :

```powershell
docker compose down
```
