# FitManager — guide de démarrage

FitManager est une application web React/TypeScript avec une API Express connectée à PostgreSQL. Elle n'embarque aucune donnée fictive et ne crée, ne réinitialise ni ne modifie les tables du projet SQL.

## Prérequis

- Node.js 20 ou plus récent et npm
- PostgreSQL démarré, avec la base `salle_sport` déjà créée
- Le fichier `projet.sql` déjà exécuté dans cette base depuis pgAdmin 4
- Des comptes PostgreSQL de connexion associés aux rôles `role_accueil` et `role_comptabilite`

## Installation

Ouvre un terminal PowerShell dans le dossier du projet, puis exécute :

```powershell
Copy-Item .env.example .env
npm install
```

Ouvre ensuite `.env` et renseigne les mots de passe des deux comptes PostgreSQL ainsi que les deux mots de passe de connexion à l'application. Remplace aussi `JWT_SECRET` par une clé aléatoire. Pour en générer une dans PowerShell :

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Les comptes PostgreSQL indiqués par défaut dans `.env.example` sont `utilisateur_accueil` et `utilisateur_compta`, créés par le script SQL du projet. Si tu as changé ces comptes ou leurs mots de passe, reporte ici les valeurs réellement configurées dans PostgreSQL. Le serveur utilise une connexion propre à chaque profil ; il n'utilise pas un compte superutilisateur partagé.

## Préparer les permissions FitManager

Le script d'origine donne aux rôles métiers des droits volontairement limités. Pour permettre l'affichage des adhérents, cours, abonnements et statistiques, et pour ajouter les opérations ciblées de mise à jour/annulation, une extension SQL additive est fournie dans `sql/fitmanager_permissions.sql`.

Dans pgAdmin 4 :

1. Sélectionne la base `salle_sport` et ouvre **Query Tool** avec le propriétaire de la base (le même compte qui a exécuté `projet.sql`).
2. Ouvre `sql/fitmanager_permissions.sql` dans VS Code, copie son contenu dans Query Tool, puis exécute-le une seule fois.
3. Vérifie que l'exécution se termine sans erreur.

Ce script crée uniquement des vues et fonctions `fitmanager_*`, puis accorde des droits précis aux rôles existants. Il ne supprime ni ne renomme aucun objet et ne change pas `projet.sql`.

### Sécuriser les comptes de démonstration

Le script SQL fourni à l'origine contient des mots de passe de démonstration pour ses deux rôles de connexion. Ils ne sont pas recopiés dans FitManager. Pour une configuration réelle, remplace ces mots de passe dans PostgreSQL avec des valeurs privées, puis reporte-les dans `.env`. Ne partage et ne publie jamais `.env`.

## Démarrer le site

Dans PowerShell, toujours à la racine du projet :

```powershell
npm run dev
```

Ouvre ensuite [http://localhost:5173](http://localhost:5173). Le serveur Express écoute sur le port `4000`; Vite transmet automatiquement les appels `/api` vers ce serveur. Garde le terminal ouvert pendant l'utilisation. `Ctrl+C` arrête les deux serveurs.

Les mots de passe de l'interface sont les valeurs `APP_ACCUEIL_PASSWORD` et `APP_COMPTA_PASSWORD` du fichier `.env`. Les accès PostgreSQL, séparés par profil, sont configurés avec `PG_ACCUEIL_USER`, `PG_ACCUEIL_PASSWORD`, `PG_COMPTA_USER` et `PG_COMPTA_PASSWORD`.

Pour vérifier la compilation de production :

```powershell
npm run build
```

## Fonctionnement des profils

- **Accueil** : tableau de bord, recherche des adhérents, consultation et mise à jour des abonnements, cours, réservation et annulation.
- **Comptabilité** : tableau de bord financier et consultation des paiements.
- Les réservations passent par `CALL reserver_cours(...)`. Le trigger existant reste responsable du contrôle de capacité.
- Les requêtes de recherche et de pagination utilisent des paramètres SQL ; les secrets sont lus depuis `.env`.

Si la connexion échoue, vérifie d'abord que PostgreSQL est démarré, que le nom de base est correct, que `projet.sql` et le script d'extension ont été exécutés, puis que les mots de passe et noms de rôles dans `.env` correspondent aux comptes PostgreSQL.
