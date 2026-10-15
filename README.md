# FitManager

FitManager est une application de gestion de salle de sport accompagnée d'une base PostgreSQL. Elle propose des espaces distincts pour l'accueil et la comptabilité. Le projet met également en pratique les fonctions, procédures, triggers, vues, rôles, privilèges et index SQL.

## Technologies

| Composant | Technologie | Rôle |
|---|---|---|
| Interface web | React, TypeScript et Vite | Afficher les tableaux de bord et les outils de gestion |
| API | Node.js, Express et TypeScript | Authentifier les profils et traiter les requêtes |
| Base de données | PostgreSQL 16 | Stocker les données et appliquer les règles métier |
| Environnement de base | Docker Compose | Lancer PostgreSQL et conserver ses données dans un volume |
| Outil SQL graphique | pgAdmin 4, facultatif | Explorer et administrer la base |

Docker n'est pas une base de données : il héberge ici le serveur PostgreSQL. pgAdmin est un client graphique facultatif qui peut s'y connecter.

## Fonctionnalités

- **Accueil** : tableaux de bord, recherche d'adhérents, gestion des abonnements, consultation des cours, réservations et annulations.
- **Comptabilité** : tableau de bord financier et consultation des paiements.
- **Droits d'accès** : l'API utilise un compte PostgreSQL distinct pour chaque profil.
- **Règles SQL** : la procédure de réservation vérifie l'abonnement actif et le trigger contrôle la capacité des cours.

La base comprend des données de test générées par SQL, notamment pour éprouver les requêtes et les index.

## Démarrage

### Prérequis

- Node.js 20 ou une version ultérieure, avec npm.
- Docker Desktop et Docker Compose.

### Préparer la configuration

Depuis PowerShell, à la racine du projet :

```powershell
Copy-Item .env.example .env
npm install
```

Ouvre ensuite `.env` et renseigne au minimum `APP_PASSWORD` et `JWT_SECRET`. Utilise des valeurs privées et remplace aussi les mots de passe de démonstration des comptes PostgreSQL avant une utilisation réelle. Pour créer une clé JWT aléatoire dans PowerShell :

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Ne partage pas le fichier `.env`. Il est exclu du dépôt par `.gitignore`.

### Lancer PostgreSQL et l'application

Après configuration de `.env`, démarre la base puis l'application :

```powershell
docker compose up -d
docker compose ps
npm run dev
```

L'interface est disponible à l'adresse [http://localhost:5174](http://localhost:5174). Vite transmet les appels `/api` à l'API Express, qui écoute sur le port `4000`.

**Blocage connu :** la définition de `vue_accueil_reservations` dans `projet.sql` est actuellement incomplète. L'initialisation PostgreSQL peut donc échouer lors du premier `docker compose up -d`. Cette définition doit être corrigée avant de pouvoir démarrer l'application avec une base neuve.

### pgAdmin (facultatif)

pgAdmin n'est pas lancé par le fichier Compose. S'il est installé sur l'ordinateur, crée une connexion PostgreSQL avec les paramètres suivants :

| Paramètre | Valeur |
|---|---|
| Hôte | `localhost` |
| Port | `5433` (ou la valeur de `PG_PORT` dans `.env`) |
| Base | Valeur de `PG_DATABASE`, par défaut `salle_sport` |
| Utilisateur administrateur | `fitmanager_admin` |
| Mot de passe | Valeur de `POSTGRES_PASSWORD` dans `.env` |

Le port `5433` côté ordinateur est redirigé vers le port PostgreSQL `5432` dans le conteneur. Pour une connexion depuis un autre conteneur du même réseau Compose, l'hôte est `db` et le port est `5432`.

## Structure du projet

```text
api/src/                 API Express, authentification et connexion PostgreSQL
web/src/                 Interface React
sql/                     Vues et fonctions complémentaires de FitManager
docker/                  Initialisation des comptes PostgreSQL
projet.sql               Schéma, données de test et exercices SQL avancés
compose.yaml             Service PostgreSQL et volume persistant
GUIDE_FITMANAGER.md      Guide détaillé de configuration et d'utilisation
```

## Concepts SQL présentés

- **Fonction `nombre_reservations_adherent`** : compte les réservations confirmées d'un adhérent.
- **Procédure `reserver_cours`** : vérifie l'abonnement actif avant de créer une réservation.
- **Trigger `trg_verifier_capacite`** : empêche de dépasser la capacité d'un cours, y compris lors d'accès concurrents.
- **Vues métier** : `vue_accueil_reservations` et `vue_compta_paiements` exposent les informations propres à chaque profil.
- **Rôles et privilèges** : `role_accueil` et `role_comptabilite` appliquent le principe du moindre privilège.
- **Index** : `idx_reservations_cours` et `idx_paiements_date` illustrent l'optimisation des recherches.
- **Données de test** : `generate_series` génère des adhérents, des cours et des réservations pour les essais.

Les plans et les temps d'exécution dépendent de l'environnement. Le script SQL contient des requêtes `EXPLAIN (ANALYZE, BUFFERS)` pour examiner l'effet des index.

## Arrêter et conserver les données

Pour arrêter les conteneurs sans supprimer la base :

```powershell
docker compose down
```

Les données restent dans le volume `postgres_data`. Les scripts d'initialisation ne sont exécutés qu'à la création d'un volume vide. **La commande suivante supprime définitivement ce volume et toutes les données qu'il contient :**

```powershell
docker compose down -v
```

## Vérification de compilation

```powershell
npm run build
```

Consulte [GUIDE_FITMANAGER.md](GUIDE_FITMANAGER.md) pour les détails de configuration, les profils et le dépannage.